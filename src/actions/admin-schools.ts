"use server";

import type { Database } from "@/database.types";
import { fetchAdminSchoolsExportRows } from "@/app/(protected)/admin/schools/_lib/fetch-admin-schools-export";
import type { AdminSchoolsPageFilters } from "@/app/(protected)/admin/schools/_lib/parse-admin-schools-search-params";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type SchoolSubscriptionStatus = Database["public"]["Enums"]["school_subscription_status"];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AdminSchoolActionResult = { ok: true } | { ok: false; error: string };

export type AdminCountryOption = { id: string; name: string };

type ExportAdminSchoolsResult =
  | { ok: true; rows: Awaited<ReturnType<typeof fetchAdminSchoolsExportRows>> }
  | { ok: false; error: string };

type CreateAdminSchoolResult =
  | { ok: true; schoolId: string }
  | { ok: false; error: string };

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
    console.error("[admin-schools] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return { ok: false as const, error: "You do not have permission to manage schools." };
  }

  return { ok: true as const, userId: user.id };
}

function parseOptionalInt(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseRequiredInt(raw: FormDataEntryValue | null, label: string): number | null | "invalid" {
  const value = String(raw ?? "").trim();
  if (!value) return "invalid";
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) return "invalid";
  return n;
}

export async function updateAdminSchool(formData: FormData): Promise<AdminSchoolActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const schoolId = String(formData.get("schoolId") ?? "").trim();
  if (!UUID_RE.test(schoolId)) {
    return { ok: false, error: "Invalid school." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim().toLowerCase();
  const city = String(formData.get("city") ?? "").trim();
  const countryCode = String(formData.get("countryCode") ?? "").trim();
  const subscriptionStatus = String(
    formData.get("subscriptionStatus") ?? "ACTIVE",
  ).trim() as SchoolSubscriptionStatus;

  const studentsLimit = parseOptionalInt(formData.get("studentsLimit"));
  const creditPoolRaw = parseRequiredInt(formData.get("creditPool"), "Credit pool");
  const yearlyCreditPlan = parseOptionalInt(formData.get("yearlyCreditPlan"));
  const defaultAdvisorCreditLimit = parseOptionalInt(formData.get("defaultAdvisorCreditLimit"));
  const defaultAmbassadorCreditLimit = parseOptionalInt(
    formData.get("defaultAmbassadorCreditLimit"),
  );
  const renewalDateRaw = String(formData.get("renewalDate") ?? "").trim();
  const renewalDate = renewalDateRaw.length > 0 ? renewalDateRaw : null;

  if (!name) return { ok: false, error: "School name is required." };
  if (!code) return { ok: false, error: "School code is required." };
  if (!EMAIL_RE.test(contactEmail)) return { ok: false, error: "Enter a valid contact email." };
  if (!countryCode) return { ok: false, error: "Country is required." };
  if (creditPoolRaw === "invalid") {
    return { ok: false, error: "Enter a valid credit pool amount." };
  }
  if (
    subscriptionStatus !== "ACTIVE" &&
    subscriptionStatus !== "INACTIVE"
  ) {
    return { ok: false, error: "Invalid subscription status." };
  }

  const service = await createSupabaseSecretClient();

  const { data: existing, error: existingError } = await service
    .from("schools")
    .select("id, credit_pool")
    .eq("id", schoolId)
    .maybeSingle();

  if (existingError) {
    console.error("[admin-schools] fetch existing", existingError);
    return { ok: false, error: "Could not load school." };
  }

  if (!existing) {
    return { ok: false, error: "School not found." };
  }

  const previousPool = existing.credit_pool ?? 0;
  const newPool = creditPoolRaw ?? 0;

  const { error: updateError } = await service
    .from("schools")
    .update({
      name,
      code,
      contact_email: contactEmail,
      city: city || null,
      country_code: countryCode,
      subscription_status: subscriptionStatus,
      students_limit: studentsLimit,
      credit_pool: newPool,
      yearly_credit_plan: yearlyCreditPlan,
      default_advisor_credit_limit: defaultAdvisorCreditLimit,
      default_ambasador_credit_limit: defaultAmbassadorCreditLimit,
      renewal_date: renewalDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", schoolId);

  if (updateError) {
    console.error("[admin-schools] update", updateError);
    return { ok: false, error: "Could not update school." };
  }

  if (newPool > previousPool) {
    const delta = newPool - previousPool;
    const { error: rechargeError } = await service.from("school_recharge_history").insert({
      school_id: schoolId,
      amount: delta,
      kind: "EXTRA",
    });

    if (rechargeError) {
      console.error("[admin-schools] recharge history", rechargeError);
    }
  }

  revalidatePath("/admin/schools");
  revalidatePath(`/admin/schools/${schoolId}`);

  return { ok: true };
}

export async function deactivateAdminSchool(
  schoolId: string,
): Promise<AdminSchoolActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const id = schoolId.trim();
  if (!UUID_RE.test(id)) {
    return { ok: false, error: "Invalid school." };
  }

  const service = await createSupabaseSecretClient();
  const { data: school, error: fetchError } = await service
    .from("schools")
    .select("id, is_active")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !school) {
    console.error("[admin-schools] deactivate fetch", fetchError);
    return { ok: false, error: "School not found." };
  }

  if (school.is_active === false) {
    return { ok: false, error: "School is already inactive." };
  }

  const { error: updateError } = await service
    .from("schools")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    console.error("[admin-schools] deactivate", updateError);
    return { ok: false, error: "Could not deactivate school." };
  }

  revalidatePath("/admin/schools");
  revalidatePath(`/admin/schools/${id}`);

  return { ok: true };
}

export async function activateAdminSchool(
  schoolId: string,
): Promise<AdminSchoolActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const id = schoolId.trim();
  if (!UUID_RE.test(id)) {
    return { ok: false, error: "Invalid school." };
  }

  const service = await createSupabaseSecretClient();
  const { data: school, error: fetchError } = await service
    .from("schools")
    .select("id, is_active")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !school) {
    console.error("[admin-schools] activate fetch", fetchError);
    return { ok: false, error: "School not found." };
  }

  if (school.is_active !== false) {
    return { ok: false, error: "School is already active." };
  }

  const { error: updateError } = await service
    .from("schools")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    console.error("[admin-schools] activate", updateError);
    return { ok: false, error: "Could not activate school." };
  }

  revalidatePath("/admin/schools");
  revalidatePath(`/admin/schools/${id}`);

  return { ok: true };
}

export async function renewAdminSchoolSubscription(
  schoolId: string,
): Promise<AdminSchoolActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const id = schoolId.trim();
  if (!UUID_RE.test(id)) {
    return { ok: false, error: "Invalid school." };
  }

  const service = await createSupabaseSecretClient();
  const { error } = await service.rpc("renew_school_subscription", {
    p_school_id: id,
  });

  if (error) {
    console.error("[admin-schools] renew subscription", error);
    const message = error.message ?? "Could not renew subscription.";

    if (message.includes("already active")) {
      return { ok: false, error: "Subscription is already active." };
    }
    if (message.includes("Yearly credit plan")) {
      return { ok: false, error: "Yearly credit plan is not configured for this school." };
    }
    if (message.includes("Renewal date")) {
      return { ok: false, error: "Renewal date is not configured for this school." };
    }
    if (message.includes("School not found")) {
      return { ok: false, error: "School not found." };
    }

    return { ok: false, error: "Could not renew subscription." };
  }

  revalidatePath("/admin/schools");
  revalidatePath(`/admin/schools/${id}`);

  return { ok: true };
}

export async function fetchAdminSchoolFormCountries(): Promise<
  { ok: true; countries: AdminCountryOption[] } | { ok: false; error: string }
> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const service = await createSupabaseSecretClient();
  const { data, error } = await service
    .from("countries")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("[admin-schools] countries", error);
    return { ok: false, error: "Could not load countries." };
  }

  return {
    ok: true,
    countries: (data ?? []).map((country) => ({
      id: country.id.trim(),
      name: country.name.trim(),
    })),
  };
}

export async function exportAdminSchoolsExcel(
  filters: Pick<AdminSchoolsPageFilters, "q" | "status">,
): Promise<ExportAdminSchoolsResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  try {
    const rows = await fetchAdminSchoolsExportRows(filters);
    return { ok: true, rows };
  } catch (error) {
    console.error("[admin-schools] export", error);
    return { ok: false, error: "Could not export schools." };
  }
}

export async function createAdminSchool(formData: FormData): Promise<CreateAdminSchoolResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim().toLowerCase();
  const city = String(formData.get("city") ?? "").trim();
  const countryCode = String(formData.get("countryCode") ?? "").trim();
  const studentsLimit = parseOptionalInt(formData.get("studentsLimit"));
  const yearlyCreditPlan = parseOptionalInt(formData.get("yearlyCreditPlan"));
  const defaultAdvisorCreditLimit = parseOptionalInt(formData.get("defaultAdvisorCreditLimit"));
  const defaultAmbassadorCreditLimit = parseOptionalInt(
    formData.get("defaultAmbassadorCreditLimit"),
  );

  if (!name) return { ok: false, error: "School name is required." };
  if (!code) return { ok: false, error: "School code is required." };
  if (!EMAIL_RE.test(contactEmail)) return { ok: false, error: "Enter a valid contact email." };
  if (!countryCode) return { ok: false, error: "Country is required." };

  const service = await createSupabaseSecretClient();

  const [{ data: existingCode }, { data: country }] = await Promise.all([
    service.from("schools").select("id").eq("code", code).maybeSingle(),
    service.from("countries").select("id").eq("id", countryCode).maybeSingle(),
  ]);

  if (existingCode) {
    return { ok: false, error: "A school with this code already exists." };
  }

  if (!country) {
    return { ok: false, error: "Select a valid country." };
  }

  const { data: created, error: insertError } = await service
    .from("schools")
    .insert({
      name,
      code,
      contact_email: contactEmail,
      city: city || null,
      country_code: countryCode,
      students_limit: studentsLimit,
      yearly_credit_plan: yearlyCreditPlan,
      credit_pool: yearlyCreditPlan ?? 0,
      default_advisor_credit_limit: defaultAdvisorCreditLimit,
      default_ambasador_credit_limit: defaultAmbassadorCreditLimit,
      is_active: true,
      subscription_status: "ACTIVE",
    })
    .select("id")
    .single();

  if (insertError || !created) {
    console.error("[admin-schools] create", insertError);
    return { ok: false, error: "Could not create school." };
  }

  if (yearlyCreditPlan != null && yearlyCreditPlan > 0) {
    const { error: rechargeError } = await service.from("school_recharge_history").insert({
      school_id: created.id,
      amount: yearlyCreditPlan,
      kind: "YEARLY_SUB",
    });

    if (rechargeError) {
      console.error("[admin-schools] create recharge history", rechargeError);
    }
  }

  revalidatePath("/admin/schools");

  return { ok: true, schoolId: created.id };
}
