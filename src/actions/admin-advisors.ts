"use server";

import { parseMultilineStringList, personDuplicateKey } from "@/lib/admin-csv-utils";
import { assertAdminPermission } from "@/lib/assert-admin-permission";
import {
  replaceAdvisorSpecializations,
  replaceAdvisorTags,
} from "@/lib/advisor-csv-import";
import { applyAdvisorReceivingFlags } from "@/lib/advisor-receiving-flags";
import { isResendConfigured } from "@/lib/resend/config";
import { sendStaffCredentialsEmail } from "@/lib/resend/staff-credentials-email";
import { buildLoginPageUrl } from "@/lib/resend/site-url";
import {
  findAuthUserByEmail,
  isAdvisorLoginProvisioned,
} from "@/lib/auth-user-lookup";
import {
  isAllowedImageFile,
  publicStorageObjectUrl,
  resolveContentType,
  sanitizeFilename,
} from "@/lib/storage-utils";
import type { Json } from "@/database.types";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

const ADVISOR_AVATARS_BUCKET = "advisor-avatars";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const MIN_PASSWORD_LENGTH = 8;

type AuthUserMetadata = { type?: string; firstName?: string; lastName?: string };

function authAccountTypeConflictMessage(existingType: string | undefined): string | null {
  if (!existingType || existingType === "advisor") return null;
  return "This email belongs to another account type and cannot be used for advisor login.";
}

export type AdminCountryOption = {
  id: string;
  name: string;
};

async function assertAdminAccess() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false as const, error: "You must be signed in." };
  }

  const service = await createSupabaseSecretClient();
  const { data: admin, error: adminError } = await service
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("[admin-advisors] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return { ok: false as const, error: "You do not have permission to manage advisors." };
  }

  return { ok: true as const, userId: user.id };
}

type FetchAdvisorFormOptionsResult =
  | { ok: true; countries: AdminCountryOption[] }
  | { ok: false; error: string };

export async function fetchAdvisorFormOptions(): Promise<FetchAdvisorFormOptionsResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  try {
    const service = await createSupabaseSecretClient();
    const { data: countries, error } = await service
      .from("countries")
      .select("id, name")
      .order("name");

    if (error) throw error;

    return {
      ok: true,
      countries: (countries ?? []) as AdminCountryOption[],
    };
  } catch (error) {
    console.error("[fetchAdvisorFormOptions]", error);
    return { ok: false, error: "Could not load form options." };
  }
}

function parseOptionalInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number.parseInt(trimmed.replace(/,/g, ""), 10);
  return Number.isFinite(value) ? value : null;
}

function parsePayoutPercentage(raw: FormDataEntryValue | null): number | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return 0;
  const value = Number.parseInt(trimmed.replace(/,/g, ""), 10);
  if (!Number.isFinite(value) || value < 0 || value > 100) return null;
  return value;
}

function parseCommaList(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseCheckbox(raw: FormDataEntryValue | null): boolean {
  if (raw === "on" || raw === "true" || raw === "1") return true;
  return false;
}

function toJsonArray(values: string[]): Json | null {
  return values.length > 0 ? values : null;
}

async function uploadAdvisorAvatar(
  service: Awaited<ReturnType<typeof createSupabaseSecretClient>>,
  advisorId: string,
  file: File,
): Promise<string> {
  if (!isAllowedImageFile(file)) {
    throw new Error("Avatar must be a PNG, JPEG, WebP, or GIF image.");
  }

  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error("Avatar image must be 5 MB or smaller.");
  }

  const safeName = sanitizeFilename(file.name);
  const path = `${advisorId}/${Date.now()}_${safeName}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const contentType = resolveContentType(file);

  const { error } = await service.storage.from(ADVISOR_AVATARS_BUCKET).upload(path, buf, {
    contentType,
    upsert: true,
  });

  if (error) throw error;

  return publicStorageObjectUrl(ADVISOR_AVATARS_BUCKET, path);
}

type SupabaseSecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

async function deleteAdvisorProfile(service: SupabaseSecretClient, advisorId: string) {
  await service.from("advisor_tags_joint").delete().eq("advisor_id", advisorId);
  await service.from("advisor_specializations_countries").delete().eq("advisor_id", advisorId);
  await service.from("advisors").delete().eq("id", advisorId);
}

type ProvisionAdvisorAuthResult =
  | { ok: true }
  | { ok: false; error: string; createdUserId?: string };

async function provisionAdvisorAuthAndSendCredentials(opts: {
  service: SupabaseSecretClient;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  mode: "create" | "send";
  existingUser: { id: string; user_metadata: unknown } | null;
}): Promise<ProvisionAdvisorAuthResult> {
  const { service, email, firstName, lastName, password, mode, existingUser } = opts;
  const userMetadata = { firstName, lastName, type: "advisor" as const };
  let createdUserId: string | undefined;

  if (mode === "create") {
    if (existingUser) {
      return { ok: false, error: "An account with this email already exists." };
    }

    const { data: authData, error: createError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (createError || !authData.user) {
      console.error("[provisionAdvisorAuthAndSendCredentials] createUser", createError);
      return { ok: false, error: createError?.message || "Could not create advisor login." };
    }

    createdUserId = authData.user.id;
  } else if (existingUser) {
    const existingMeta = existingUser.user_metadata as AuthUserMetadata | undefined;
    const conflict = authAccountTypeConflictMessage(existingMeta?.type);
    if (conflict) {
      return { ok: false, error: conflict };
    }

    const { error: updateError } = await service.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (updateError) {
      console.error("[provisionAdvisorAuthAndSendCredentials] updateUserById", updateError);
      return { ok: false, error: updateError.message || "Could not update advisor login." };
    }
  } else {
    const { data: authData, error: createError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (createError || !authData.user) {
      console.error("[provisionAdvisorAuthAndSendCredentials] createUser", createError);
      return { ok: false, error: createError?.message || "Could not create advisor login." };
    }
  }

  const loginUrl = await buildLoginPageUrl();
  const emailResult = await sendStaffCredentialsEmail({
    to: email,
    firstName,
    email,
    password,
    loginUrl,
  });

  if ("error" in emailResult) {
    return {
      ok: false,
      error: emailResult.error || "Credentials email could not be sent.",
      ...(createdUserId ? { createdUserId } : {}),
    };
  }

  return { ok: true };
}

type CreateAdvisorResult = { ok: true } | { ok: false; error: string };

export async function createAdvisor(formData: FormData): Promise<CreateAdvisorResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const nationalityCountryCode = String(formData.get("nationalityCountryCode") ?? "")
    .trim()
    .toUpperCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const languages = String(formData.get("languages") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const bestFor = String(formData.get("bestFor") ?? "").trim();
  const sessionFor = String(formData.get("sessionFor") ?? "").trim();
  const about = String(formData.get("about") ?? "").trim();
  const sessionCoverageRaw = String(formData.get("sessionCoverage") ?? "");
  const questionsRaw = String(formData.get("questions") ?? "");
  const tagsRaw = String(formData.get("tags") ?? "");
  const avatarFile = formData.get("avatar");

  const specializationCountryCodes = formData
    .getAll("specializationCountryCodes")
    .map((value) => String(value).trim().toUpperCase())
    .filter(Boolean);

  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  if (!firstName || !lastName) {
    return { ok: false, error: "First name and last name are required." };
  }

  if (!nationalityCountryCode) {
    return { ok: false, error: "Nationality country is required." };
  }

  const payoutPercentage = parsePayoutPercentage(formData.get("payoutPercentage"));
  if (payoutPercentage == null) {
    return { ok: false, error: "Payout percentage must be between 0 and 100." };
  }

  const receivesApplicationSupport = parseCheckbox(formData.get("receivesApplicationSupport"));
  const receivesPostAdmissionSupport = parseCheckbox(
    formData.get("receivesPostAdmissionSupport"),
  );
  const receivesFreeFunnelApplicationSupport = parseCheckbox(
    formData.get("receivesFreeFunnelApplicationSupport"),
  );

  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  if (!isResendConfigured()) {
    return {
      ok: false,
      error:
        "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL before creating advisors.",
    };
  }

  const service = await createSupabaseSecretClient();

  const authLookup = await findAuthUserByEmail(service, email);
  if (authLookup.error) {
    return { ok: false, error: authLookup.error };
  }

  if (authLookup.user) {
    const existingMeta = authLookup.user.user_metadata as AuthUserMetadata | undefined;
    const conflict = authAccountTypeConflictMessage(existingMeta?.type);
    if (conflict) {
      return { ok: false, error: conflict };
    }
    return { ok: false, error: "An account with this email already exists." };
  }

  const { data: existingAdvisor } = await service
    .from("advisors")
    .select("email, first_name, last_name")
    .eq("email", email)
    .maybeSingle();

  if (existingAdvisor) {
    const personKey = personDuplicateKey(email, firstName, lastName);
    const existingKey = personDuplicateKey(
      existingAdvisor.email,
      existingAdvisor.first_name,
      existingAdvisor.last_name,
    );
    if (existingKey === personKey) {
      return { ok: false, error: "An advisor with this email and name already exists." };
    }
    return { ok: false, error: "This email belongs to a different advisor." };
  }

  const { data: nationalityCountry } = await service
    .from("countries")
    .select("id")
    .eq("id", nationalityCountryCode)
    .maybeSingle();

  if (!nationalityCountry) {
    return { ok: false, error: "Select a valid nationality country." };
  }

  if (specializationCountryCodes.length > 0) {
    const { data: specializationCountries, error: specializationError } = await service
      .from("countries")
      .select("id")
      .in("id", specializationCountryCodes);

    if (specializationError) {
      console.error("[createAdvisor] specializations", specializationError);
      return { ok: false, error: "Could not validate specialization countries." };
    }

    if ((specializationCountries ?? []).length !== specializationCountryCodes.length) {
      return { ok: false, error: "One or more specialization countries are invalid." };
    }
  }

  const payload = {
    email,
    first_name: firstName,
    last_name: lastName,
    nationality_country_code: nationalityCountryCode,
    phone: phone || null,
    title: title || null,
    experience_years: parseOptionalInt(String(formData.get("experienceYears") ?? "")),
    languages: languages || null,
    avatar_url: null as string | null,
    description: description || null,
    best_for: bestFor || null,
    session_for: sessionFor || null,
    session_coverage: toJsonArray(parseMultilineStringList(sessionCoverageRaw)),
    about: about || null,
    questions: toJsonArray(parseMultilineStringList(questionsRaw)),
    is_active: formData.get("isActive") === "on",
    payout_percentage: payoutPercentage,
  };

  const { data: inserted, error: insertError } = await service
    .from("advisors")
    .insert(payload)
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[createAdvisor] insert", insertError);
    return { ok: false, error: insertError?.message ?? "Could not create advisor." };
  }

  const advisorId = inserted.id;

  try {
    if (avatarFile instanceof File && avatarFile.size > 0) {
      const avatarUrl = await uploadAdvisorAvatar(service, advisorId, avatarFile);
      const { error: avatarError } = await service
        .from("advisors")
        .update({ avatar_url: avatarUrl })
        .eq("id", advisorId);

      if (avatarError) throw avatarError;
    }

    const tags = parseCommaList(tagsRaw);
    if (tags.length > 0) {
      await replaceAdvisorTags(service, advisorId, tags);
    }

    if (specializationCountryCodes.length > 0) {
      await replaceAdvisorSpecializations(service, advisorId, specializationCountryCodes);
    }

    await applyAdvisorReceivingFlags(service, advisorId, {
      receivesApplicationSupport,
      receivesPostAdmissionSupport,
      receivesFreeFunnelApplicationSupport,
    });
  } catch (error) {
    console.error("[createAdvisor] post-create", error);
    await deleteAdvisorProfile(service, advisorId);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not finish creating advisor.",
    };
  }

  const authResult = await provisionAdvisorAuthAndSendCredentials({
    service,
    email,
    firstName,
    lastName,
    password,
    mode: "create",
    existingUser: null,
  });

  if (!authResult.ok) {
    if (authResult.createdUserId) {
      await service.auth.admin.deleteUser(authResult.createdUserId);
    }
    await deleteAdvisorProfile(service, advisorId);
    return { ok: false, error: authResult.error };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/advisors");

  return { ok: true };
}

type AdvisorActionResult = { ok: true } | { ok: false; error: string };

export async function deactivateAdvisor(advisorId: string): Promise<AdvisorActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const trimmedId = advisorId.trim();
  if (!trimmedId) {
    return { ok: false, error: "Advisor not found." };
  }

  const service = await createSupabaseSecretClient();
  const { data: advisor, error: fetchError } = await service
    .from("advisors")
    .select("id, is_active")
    .eq("id", trimmedId)
    .maybeSingle();

  if (fetchError) {
    console.error("[deactivateAdvisor] fetch", fetchError);
    return { ok: false, error: "Could not load advisor." };
  }

  if (!advisor) {
    return { ok: false, error: "Advisor not found." };
  }

  if (!advisor.is_active) {
    return { ok: false, error: "Advisor is already inactive." };
  }

  const { error: updateError } = await service
    .from("advisors")
    .update({ is_active: false })
    .eq("id", trimmedId);

  if (updateError) {
    console.error("[deactivateAdvisor] update", updateError);
    return { ok: false, error: "Could not deactivate advisor." };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/advisors");
  revalidatePath(`/admin/users/advisors/${trimmedId}`);

  return { ok: true };
}

export async function activateAdvisor(advisorId: string): Promise<AdvisorActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const trimmedId = advisorId.trim();
  if (!trimmedId) {
    return { ok: false, error: "Advisor not found." };
  }

  const service = await createSupabaseSecretClient();
  const { data: advisor, error: fetchError } = await service
    .from("advisors")
    .select("id, is_active")
    .eq("id", trimmedId)
    .maybeSingle();

  if (fetchError) {
    console.error("[activateAdvisor] fetch", fetchError);
    return { ok: false, error: "Could not load advisor." };
  }

  if (!advisor) {
    return { ok: false, error: "Advisor not found." };
  }

  if (advisor.is_active) {
    return { ok: false, error: "Advisor is already active." };
  }

  const { error: updateError } = await service
    .from("advisors")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", trimmedId);

  if (updateError) {
    console.error("[activateAdvisor] update", updateError);
    return { ok: false, error: "Could not activate advisor." };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/advisors");
  revalidatePath(`/admin/users/advisors/${trimmedId}`);

  return { ok: true };
}

export async function updateAdminAdvisorProfile(
  advisorId: string,
  formData: FormData,
): Promise<AdvisorActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const id = advisorId.trim();
  if (!id) {
    return { ok: false, error: "Advisor not found." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const phone = phoneRaw.length > 0 ? phoneRaw.slice(0, 64) : null;
  const title = String(formData.get("title") ?? "").trim();
  const languages = String(formData.get("languages") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const bestFor = String(formData.get("bestFor") ?? "").trim();
  const sessionFor = String(formData.get("sessionFor") ?? "").trim();
  const about = String(formData.get("about") ?? "").trim();
  const sessionCoverageRaw = String(formData.get("sessionCoverage") ?? "");
  const questionsRaw = String(formData.get("questions") ?? "");
  const tagsRaw = String(formData.get("tags") ?? "");
  const avatarFile = formData.get("avatar");
  const nationalityCountryCode = String(formData.get("nationalityCountryCode") ?? "")
    .trim()
    .toUpperCase();
  const experienceYears = parseOptionalInt(String(formData.get("experienceYears") ?? ""));
  const payoutPercentage = parsePayoutPercentage(formData.get("payoutPercentage"));
  if (payoutPercentage == null) {
    return { ok: false, error: "Payout percentage must be between 0 and 100." };
  }

  const receivesApplicationSupport = parseCheckbox(formData.get("receivesApplicationSupport"));
  const receivesPostAdmissionSupport = parseCheckbox(
    formData.get("receivesPostAdmissionSupport"),
  );
  const receivesFreeFunnelApplicationSupport = parseCheckbox(
    formData.get("receivesFreeFunnelApplicationSupport"),
  );

  const specializationCountryCodes = formData
    .getAll("specializationCountryCodes")
    .map((value) => String(value).trim().toUpperCase())
    .filter(Boolean);

  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  if (!firstName || !lastName) {
    return { ok: false, error: "First name and last name are required." };
  }

  const service = await createSupabaseSecretClient();

  const { data: existing, error: fetchError } = await service
    .from("advisors")
    .select("id, email, nationality_country_code")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    console.error("[updateAdminAdvisorProfile] fetch", fetchError);
    return { ok: false, error: "Advisor not found." };
  }

  if (email !== existing.email) {
    const { data: emailConflict } = await service
      .from("advisors")
      .select("id")
      .eq("email", email)
      .neq("id", id)
      .maybeSingle();

    if (emailConflict) {
      return { ok: false, error: "This email belongs to a different advisor." };
    }
  }

  let resolvedNationalityCountryCode = existing.nationality_country_code;

  if (nationalityCountryCode) {
    const { data: nationalityCountry } = await service
      .from("countries")
      .select("id")
      .eq("id", nationalityCountryCode)
      .maybeSingle();

    if (!nationalityCountry) {
      return { ok: false, error: "Select a valid nationality country." };
    }

    resolvedNationalityCountryCode = nationalityCountryCode;
  }

  if (specializationCountryCodes.length > 0) {
    const { data: specializationCountries, error: specializationError } = await service
      .from("countries")
      .select("id")
      .in("id", specializationCountryCodes);

    if (specializationError) {
      console.error("[updateAdminAdvisorProfile] specializations", specializationError);
      return { ok: false, error: "Could not validate specialization countries." };
    }

    if ((specializationCountries ?? []).length !== specializationCountryCodes.length) {
      return { ok: false, error: "One or more specialization countries are invalid." };
    }
  }

  const now = new Date().toISOString();
  const { error: updateError } = await service
    .from("advisors")
    .update({
      email,
      first_name: firstName,
      last_name: lastName,
      phone,
      title: title || null,
      languages: languages || null,
      nationality_country_code: resolvedNationalityCountryCode,
      experience_years: experienceYears,
      description: description || null,
      best_for: bestFor || null,
      session_for: sessionFor || null,
      session_coverage: toJsonArray(parseMultilineStringList(sessionCoverageRaw)),
      about: about || null,
      questions: toJsonArray(parseMultilineStringList(questionsRaw)),
      is_active: parseCheckbox(formData.get("isActive")),
      payout_percentage: payoutPercentage,
      updated_at: now,
    })
    .eq("id", id);

  if (updateError) {
    console.error("[updateAdminAdvisorProfile] update", updateError);
    if (updateError.code === "23505") {
      return { ok: false, error: "This email belongs to a different advisor." };
    }
    return { ok: false, error: updateError.message || "Could not update advisor." };
  }

  try {
    if (avatarFile instanceof File && avatarFile.size > 0) {
      const avatarUrl = await uploadAdvisorAvatar(service, id, avatarFile);
      const { error: avatarError } = await service
        .from("advisors")
        .update({ avatar_url: avatarUrl, updated_at: now })
        .eq("id", id);

      if (avatarError) throw avatarError;
    }

    await replaceAdvisorTags(service, id, parseCommaList(tagsRaw));
    await replaceAdvisorSpecializations(service, id, specializationCountryCodes);
    await applyAdvisorReceivingFlags(service, id, {
      receivesApplicationSupport,
      receivesPostAdmissionSupport,
      receivesFreeFunnelApplicationSupport,
    });
  } catch (error) {
    console.error("[updateAdminAdvisorProfile] post-update", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Advisor updated but some fields could not be saved.",
    };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/advisors");
  revalidatePath(`/admin/users/advisors/${id}`);
  return { ok: true };
}

export async function sendAdvisorLoginCredentials(
  advisorId: string,
  formData: FormData,
): Promise<AdvisorActionResult> {
  const access = await assertAdminPermission("edit_advisors");
  if (!access.ok) return access;

  const id = advisorId.trim();
  if (!id) {
    return { ok: false, error: "Advisor not found." };
  }

  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  if (!isResendConfigured()) {
    return {
      ok: false,
      error:
        "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL before sending credentials.",
    };
  }

  const service = await createSupabaseSecretClient();
  const { data: advisor, error: fetchError } = await service
    .from("advisors")
    .select("id, email, first_name, last_name")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !advisor?.email) {
    console.error("[sendAdvisorLoginCredentials] fetch", fetchError);
    return { ok: false, error: "Advisor not found." };
  }

  const email = advisor.email.trim().toLowerCase();
  const firstName = advisor.first_name.trim();
  const lastName = advisor.last_name.trim();

  if (await isAdvisorLoginProvisioned(service, email)) {
    return {
      ok: false,
      error: "Login credentials have already been sent. Use Resend new Credentials instead.",
    };
  }

  const existingLookup = await findAuthUserByEmail(service, email);
  if (existingLookup.error) {
    return { ok: false, error: existingLookup.error };
  }

  const provisionResult = await provisionAdvisorAuthAndSendCredentials({
    service,
    email,
    firstName,
    lastName,
    password,
    mode: "send",
    existingUser: existingLookup.user,
  });

  if (!provisionResult.ok) {
    return { ok: false, error: provisionResult.error };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/advisors");
  revalidatePath(`/admin/users/advisors/${id}`);

  return { ok: true };
}

export async function resendAdvisorLoginCredentials(
  advisorId: string,
  formData: FormData,
): Promise<AdvisorActionResult> {
  const access = await assertAdminPermission("edit_advisors");
  if (!access.ok) return access;

  const id = advisorId.trim();
  if (!id) {
    return { ok: false, error: "Advisor not found." };
  }

  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  if (!isResendConfigured()) {
    return {
      ok: false,
      error:
        "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL before sending credentials.",
    };
  }

  const service = await createSupabaseSecretClient();
  const { data: advisor, error: fetchError } = await service
    .from("advisors")
    .select("id, email, first_name, last_name")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !advisor?.email) {
    console.error("[resendAdvisorLoginCredentials] fetch", fetchError);
    return { ok: false, error: "Advisor not found." };
  }

  const email = advisor.email.trim().toLowerCase();
  const firstName = advisor.first_name.trim();
  const lastName = advisor.last_name.trim();
  const userMetadata = { firstName, lastName, type: "advisor" as const };

  if (!(await isAdvisorLoginProvisioned(service, email))) {
    return {
      ok: false,
      error: "No login account exists yet. Use Send Login Credentials first.",
    };
  }

  const existingLookup = await findAuthUserByEmail(service, email);
  if (existingLookup.error) {
    return { ok: false, error: existingLookup.error };
  }

  const existingUser = existingLookup.user;
  if (!existingUser) {
    return {
      ok: false,
      error: "Advisor login account could not be found. Use Send Login Credentials instead.",
    };
  }

  const existingMeta = existingUser.user_metadata as AuthUserMetadata | undefined;
  const conflict = authAccountTypeConflictMessage(existingMeta?.type);
  if (conflict) {
    return { ok: false, error: conflict };
  }

  const { error: updateError } = await service.auth.admin.updateUserById(existingUser.id, {
    password,
    email_confirm: true,
    user_metadata: userMetadata,
  });

  if (updateError) {
    console.error("[resendAdvisorLoginCredentials] updateUserById", updateError);
    return { ok: false, error: updateError.message || "Could not reset advisor password." };
  }

  const loginUrl = await buildLoginPageUrl();
  const emailResult = await sendStaffCredentialsEmail({
    to: email,
    firstName,
    email,
    password,
    loginUrl,
  });

  if ("error" in emailResult) {
    return {
      ok: false,
      error: emailResult.error || "Credentials email could not be sent.",
    };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/advisors");
  revalidatePath(`/admin/users/advisors/${id}`);

  return { ok: true };
}

export async function deleteAdvisor(advisorId: string): Promise<AdvisorActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const trimmedId = advisorId.trim();
  if (!trimmedId) {
    return { ok: false, error: "Advisor not found." };
  }

  const service = await createSupabaseSecretClient();
  const { data: advisor, error: fetchError } = await service
    .from("advisors")
    .select("id")
    .eq("id", trimmedId)
    .maybeSingle();

  if (fetchError) {
    console.error("[deleteAdvisor] fetch", fetchError);
    return { ok: false, error: "Could not load advisor." };
  }

  if (!advisor) {
    return { ok: false, error: "Advisor not found." };
  }

  await service.from("advisor_tags_joint").delete().eq("advisor_id", trimmedId);
  await service.from("advisor_specializations_countries").delete().eq("advisor_id", trimmedId);

  const { error: deleteError } = await service.from("advisors").delete().eq("id", trimmedId);

  if (deleteError) {
    console.error("[deleteAdvisor] delete", deleteError);
    if (deleteError.code === "23503") {
      return {
        ok: false,
        error: "Cannot delete this advisor because they have linked sessions or activity records.",
      };
    }
    return { ok: false, error: "Could not delete advisor." };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/advisors");

  return { ok: true };
}
