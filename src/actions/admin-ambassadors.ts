"use server";

import { replaceAmbassadorTags } from "@/lib/ambassador-csv-import";
import { parseMultilineStringList, personDuplicateKey } from "@/lib/admin-csv-utils";
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

const AMBASSADOR_AVATARS_BUCKET = "ambassador-avatars";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export type AdminCountryOption = {
  id: string;
  name: string;
};

export type AdminUniversityOption = {
  id: string;
  name: string;
  country_code: string;
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
    console.error("[admin-ambassadors] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return { ok: false as const, error: "You do not have permission to manage ambassadors." };
  }

  return { ok: true as const };
}

type FetchAmbassadorFormOptionsResult =
  | { ok: true; countries: AdminCountryOption[]; universities: AdminUniversityOption[] }
  | { ok: false; error: string };

export async function fetchAmbassadorFormOptions(): Promise<FetchAmbassadorFormOptionsResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  try {
    const service = await createSupabaseSecretClient();
    const [{ data: countries, error: countriesError }, { data: universities, error: universitiesError }] =
      await Promise.all([
        service.from("countries").select("id, name").order("name"),
        service.from("universities").select("id, name, country_code").order("name"),
      ]);

    if (countriesError) throw countriesError;
    if (universitiesError) throw universitiesError;

    return {
      ok: true,
      countries: (countries ?? []) as AdminCountryOption[],
      universities: (universities ?? []) as AdminUniversityOption[],
    };
  } catch (error) {
    console.error("[fetchAmbassadorFormOptions]", error);
    return { ok: false, error: "Could not load form options." };
  }
}

function parseOptionalInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number.parseInt(trimmed.replace(/,/g, ""), 10);
  return Number.isFinite(value) ? value : null;
}

function parseCheckbox(raw: FormDataEntryValue | null): boolean {
  if (raw === "on" || raw === "true" || raw === "1") return true;
  return false;
}

function toJsonArray(values: string[]): Json | null {
  return values.length > 0 ? values : null;
}

async function uploadAmbassadorAvatar(
  service: Awaited<ReturnType<typeof createSupabaseSecretClient>>,
  ambassadorId: string,
  file: File,
): Promise<string> {
  if (!isAllowedImageFile(file)) {
    throw new Error("Avatar must be a PNG, JPEG, WebP, or GIF image.");
  }

  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error("Avatar image must be 5 MB or smaller.");
  }

  const safeName = sanitizeFilename(file.name);
  const path = `${ambassadorId}/${Date.now()}_${safeName}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const contentType = resolveContentType(file);

  const { error } = await service.storage.from(AMBASSADOR_AVATARS_BUCKET).upload(path, buf, {
    contentType,
    upsert: true,
  });

  if (error) throw error;

  return publicStorageObjectUrl(AMBASSADOR_AVATARS_BUCKET, path);
}

type CreateAmbassadorResult = { ok: true } | { ok: false; error: string };

export async function createAmbassador(formData: FormData): Promise<CreateAmbassadorResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const destinationCountryCode = String(formData.get("destinationCountryCode") ?? "")
    .trim()
    .toUpperCase();
  const nationalityCountryCode = String(formData.get("nationalityCountryCode") ?? "")
    .trim()
    .toUpperCase();
  const universityIdRaw = String(formData.get("universityId") ?? "").trim();
  const universityName = String(formData.get("universityName") ?? "").trim();
  const major = String(formData.get("major") ?? "").trim();
  const about = String(formData.get("about") ?? "").trim();
  const helpInRaw = String(formData.get("helpIn") ?? "");
  const tagsRaw = String(formData.get("tags") ?? "");
  const avatarFile = formData.get("avatar");

  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  if (!firstName || !lastName) {
    return { ok: false, error: "First name and last name are required." };
  }

  if (!destinationCountryCode || !nationalityCountryCode) {
    return { ok: false, error: "Destination and nationality countries are required." };
  }

  const service = await createSupabaseSecretClient();

  const { data: existingAmbassador } = await service
    .from("ambassadors")
    .select("email, first_name, last_name")
    .eq("email", email)
    .maybeSingle();

  if (existingAmbassador) {
    const personKey = personDuplicateKey(email, firstName, lastName);
    const existingKey = personDuplicateKey(
      existingAmbassador.email,
      existingAmbassador.first_name,
      existingAmbassador.last_name,
    );
    if (existingKey === personKey) {
      return { ok: false, error: "An ambassador with this email and name already exists." };
    }
    return { ok: false, error: "This email belongs to a different ambassador." };
  }

  const [{ data: destinationCountry }, { data: nationalityCountry }] = await Promise.all([
    service.from("countries").select("id").eq("id", destinationCountryCode).maybeSingle(),
    service.from("countries").select("id").eq("id", nationalityCountryCode).maybeSingle(),
  ]);

  if (!destinationCountry || !nationalityCountry) {
    return { ok: false, error: "Select valid destination and nationality countries." };
  }

  let universityId: string | null = universityIdRaw || null;
  let resolvedUniversityName: string | null = universityName || null;

  if (universityId) {
    const { data: university } = await service
      .from("universities")
      .select("id, name")
      .eq("id", universityId)
      .maybeSingle();

    if (!university) {
      return { ok: false, error: "Selected university was not found." };
    }

    if (!resolvedUniversityName) {
      resolvedUniversityName = university.name;
    }
  } else {
    universityId = null;
  }

  const payload = {
    email,
    first_name: firstName,
    last_name: lastName,
    destination_country_code: destinationCountryCode,
    nationality_country_code: nationalityCountryCode,
    university_id: universityId,
    university_name: resolvedUniversityName,
    avatar_url: null as string | null,
    start_year: parseOptionalInt(String(formData.get("startYear") ?? "")),
    graduation_year: parseOptionalInt(String(formData.get("graduationYear") ?? "")),
    is_current_student: parseCheckbox(formData.get("isCurrentStudent")),
    major: major || null,
    has_msc: parseCheckbox(formData.get("hasMsc")),
    has_phd: parseCheckbox(formData.get("hasPhd")),
    about: about || null,
    help_in: toJsonArray(parseMultilineStringList(helpInRaw)),
    is_active: formData.get("isActive") === "on",
  };

  const { data: inserted, error: insertError } = await service
    .from("ambassadors")
    .insert(payload)
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[createAmbassador] insert", insertError);
    return { ok: false, error: insertError?.message ?? "Could not create ambassador." };
  }

  const ambassadorId = inserted.id;

  try {
    if (avatarFile instanceof File && avatarFile.size > 0) {
      const avatarUrl = await uploadAmbassadorAvatar(service, ambassadorId, avatarFile);
      const { error: avatarError } = await service
        .from("ambassadors")
        .update({ avatar_url: avatarUrl })
        .eq("id", ambassadorId);

      if (avatarError) throw avatarError;
    }

    const tags = parseMultilineStringList(tagsRaw, { allowCommaFallback: true });
    if (tags.length > 0) {
      await replaceAmbassadorTags(service, ambassadorId, tags);
    }
  } catch (error) {
    console.error("[createAmbassador] post-create", error);
    await service.from("ambassador_tags_joint").delete().eq("ambassador_id", ambassadorId);
    await service.from("ambassadors").delete().eq("id", ambassadorId);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not finish creating ambassador.",
    };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/ambassadors");

  return { ok: true };
}

type AmbassadorActionResult = { ok: true } | { ok: false; error: string };

export async function deactivateAmbassador(
  ambassadorId: string,
): Promise<AmbassadorActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const trimmedId = ambassadorId.trim();
  if (!trimmedId) {
    return { ok: false, error: "Ambassador not found." };
  }

  const service = await createSupabaseSecretClient();
  const { data: ambassador, error: fetchError } = await service
    .from("ambassadors")
    .select("id, is_active")
    .eq("id", trimmedId)
    .maybeSingle();

  if (fetchError) {
    console.error("[deactivateAmbassador] fetch", fetchError);
    return { ok: false, error: "Could not load ambassador." };
  }

  if (!ambassador) {
    return { ok: false, error: "Ambassador not found." };
  }

  if (!ambassador.is_active) {
    return { ok: false, error: "Ambassador is already inactive." };
  }

  const { error: updateError } = await service
    .from("ambassadors")
    .update({ is_active: false })
    .eq("id", trimmedId);

  if (updateError) {
    console.error("[deactivateAmbassador] update", updateError);
    return { ok: false, error: "Could not deactivate ambassador." };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/ambassadors");
  revalidatePath(`/admin/users/ambassadors/${trimmedId}`);

  return { ok: true };
}

export async function activateAmbassador(
  ambassadorId: string,
): Promise<AmbassadorActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const trimmedId = ambassadorId.trim();
  if (!trimmedId) {
    return { ok: false, error: "Ambassador not found." };
  }

  const service = await createSupabaseSecretClient();
  const { data: ambassador, error: fetchError } = await service
    .from("ambassadors")
    .select("id, is_active")
    .eq("id", trimmedId)
    .maybeSingle();

  if (fetchError) {
    console.error("[activateAmbassador] fetch", fetchError);
    return { ok: false, error: "Could not load ambassador." };
  }

  if (!ambassador) {
    return { ok: false, error: "Ambassador not found." };
  }

  if (ambassador.is_active) {
    return { ok: false, error: "Ambassador is already active." };
  }

  const { error: updateError } = await service
    .from("ambassadors")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", trimmedId);

  if (updateError) {
    console.error("[activateAmbassador] update", updateError);
    return { ok: false, error: "Could not activate ambassador." };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/ambassadors");
  revalidatePath(`/admin/users/ambassadors/${trimmedId}`);

  return { ok: true };
}

export async function updateAdminAmbassadorProfile(
  ambassadorId: string,
  formData: FormData,
): Promise<AmbassadorActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const id = ambassadorId.trim();
  if (!id) {
    return { ok: false, error: "Ambassador not found." };
  }

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const destinationCountryCode = String(formData.get("destinationCountryCode") ?? "")
    .trim()
    .toUpperCase();
  const nationalityCountryCode = String(formData.get("nationalityCountryCode") ?? "")
    .trim()
    .toUpperCase();
  const universityIdRaw = String(formData.get("universityId") ?? "").trim();
  const universityName = String(formData.get("universityName") ?? "").trim();
  const major = String(formData.get("major") ?? "").trim();
  const about = String(formData.get("about") ?? "").trim();
  const helpInRaw = String(formData.get("helpIn") ?? "");
  const tagsRaw = String(formData.get("tags") ?? "");
  const avatarFile = formData.get("avatar");

  if (!firstName || !lastName) {
    return { ok: false, error: "First name and last name are required." };
  }

  if (!destinationCountryCode || !nationalityCountryCode) {
    return { ok: false, error: "Destination and nationality countries are required." };
  }

  const service = await createSupabaseSecretClient();

  const { data: existing, error: fetchError } = await service
    .from("ambassadors")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    console.error("[updateAdminAmbassadorProfile] fetch", fetchError);
    return { ok: false, error: "Ambassador not found." };
  }

  const [{ data: destinationCountry }, { data: nationalityCountry }] = await Promise.all([
    service.from("countries").select("id").eq("id", destinationCountryCode).maybeSingle(),
    service.from("countries").select("id").eq("id", nationalityCountryCode).maybeSingle(),
  ]);

  if (!destinationCountry || !nationalityCountry) {
    return { ok: false, error: "Select valid destination and nationality countries." };
  }

  let universityId: string | null = universityIdRaw || null;
  let resolvedUniversityName: string | null = universityName || null;

  if (universityId) {
    const { data: university } = await service
      .from("universities")
      .select("id, name")
      .eq("id", universityId)
      .maybeSingle();

    if (!university) {
      return { ok: false, error: "Selected university was not found." };
    }

    if (!resolvedUniversityName) {
      resolvedUniversityName = university.name;
    }
  } else {
    universityId = null;
  }

  const now = new Date().toISOString();
  const { error: updateError } = await service
    .from("ambassadors")
    .update({
      first_name: firstName,
      last_name: lastName,
      destination_country_code: destinationCountryCode,
      nationality_country_code: nationalityCountryCode,
      university_id: universityId,
      university_name: resolvedUniversityName,
      major: major || null,
      start_year: parseOptionalInt(String(formData.get("startYear") ?? "")),
      graduation_year: parseOptionalInt(String(formData.get("graduationYear") ?? "")),
      is_current_student: parseCheckbox(formData.get("isCurrentStudent")),
      has_msc: parseCheckbox(formData.get("hasMsc")),
      has_phd: parseCheckbox(formData.get("hasPhd")),
      about: about || null,
      help_in: toJsonArray(parseMultilineStringList(helpInRaw)),
      is_active: parseCheckbox(formData.get("isActive")),
      updated_at: now,
    })
    .eq("id", id);

  if (updateError) {
    console.error("[updateAdminAmbassadorProfile] update", updateError);
    return { ok: false, error: updateError.message || "Could not update ambassador." };
  }

  try {
    if (avatarFile instanceof File && avatarFile.size > 0) {
      const avatarUrl = await uploadAmbassadorAvatar(service, id, avatarFile);
      const { error: avatarError } = await service
        .from("ambassadors")
        .update({ avatar_url: avatarUrl, updated_at: now })
        .eq("id", id);

      if (avatarError) throw avatarError;
    }

    const tags = parseMultilineStringList(tagsRaw, { allowCommaFallback: true });
    await replaceAmbassadorTags(service, id, tags);
  } catch (error) {
    console.error("[updateAdminAmbassadorProfile] post-update", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Ambassador updated but some fields could not be saved.",
    };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/ambassadors");
  revalidatePath(`/admin/users/ambassadors/${id}`);
  return { ok: true };
}

export async function deleteAmbassador(ambassadorId: string): Promise<AmbassadorActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const trimmedId = ambassadorId.trim();
  if (!trimmedId) {
    return { ok: false, error: "Ambassador not found." };
  }

  const service = await createSupabaseSecretClient();
  const { data: ambassador, error: fetchError } = await service
    .from("ambassadors")
    .select("id")
    .eq("id", trimmedId)
    .maybeSingle();

  if (fetchError) {
    console.error("[deleteAmbassador] fetch", fetchError);
    return { ok: false, error: "Could not load ambassador." };
  }

  if (!ambassador) {
    return { ok: false, error: "Ambassador not found." };
  }

  await service.from("ambassador_tags_joint").delete().eq("ambassador_id", trimmedId);

  const { error: deleteError } = await service.from("ambassadors").delete().eq("id", trimmedId);

  if (deleteError) {
    console.error("[deleteAmbassador] delete", deleteError);
    if (deleteError.code === "23503") {
      return {
        ok: false,
        error: "Cannot delete this ambassador because they have linked session requests or activity records.",
      };
    }
    return { ok: false, error: "Could not delete ambassador." };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/ambassadors");

  return { ok: true };
}
