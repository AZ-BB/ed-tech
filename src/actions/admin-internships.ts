"use server";

import type { Database } from "@/database.types";
import {
  fetchAdminInternshipsExport,
  type AdminInternshipExportRow,
} from "@/app/(protected)/admin/content/_lib/fetch-admin-internships-export";
import { ADMIN_INTERNSHIPS_HOME } from "@/app/(protected)/admin/content/_data/content-tabs-data";
import { normalizeInternshipBulletList } from "@/lib/internship-bullet-list";
import {
  loadUsedInternshipSlugs,
  pickUniqueInternshipSlug,
  slugifyInternshipName,
} from "@/lib/internship-slug";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type InternshipSection = Database["public"]["Enums"]["internship_section"];
type InternshipFormat = Database["public"]["Enums"]["internship_format"];
type InternshipPayTier = Database["public"]["Enums"]["internship_pay_tier"];
type InternshipUrlStatus = Database["public"]["Enums"]["internship_url_status"];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AdminInternshipActionResult = { ok: true } | { ok: false; error: string };

export type AdminCountryOption = { id: string; name: string };

export type ExportAdminInternshipsResult =
  | { ok: true; rows: AdminInternshipExportRow[] }
  | { ok: false; error: string };

export type CreateAdminInternshipResult =
  | { ok: true; internshipId: string }
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
    console.error("[admin-internships] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return {
      ok: false as const,
      error: "You do not have permission to manage internships.",
    };
  }

  return { ok: true as const };
}

function parseTextArray(raw: FormDataEntryValue | null): string[] {
  return normalizeInternshipBulletList(String(raw ?? ""));
}

function parseSection(
  raw: FormDataEntryValue | null,
): InternshipSection | null {
  const value = String(raw ?? "").trim();
  if (
    value === "live" ||
    value === "global" ||
    value === "competition" ||
    value === "find"
  ) {
    return value;
  }
  return null;
}

function parseFormat(raw: FormDataEntryValue | null): InternshipFormat | null {
  const value = String(raw ?? "").trim();
  if (
    value === "in_person" ||
    value === "remote" ||
    value === "hybrid" ||
    value === "directory"
  ) {
    return value;
  }
  return null;
}

function parsePayTier(
  raw: FormDataEntryValue | null,
): InternshipPayTier | null {
  const value = String(raw ?? "").trim();
  if (value === "paid" || value === "free" || value === "unpaid") return value;
  return null;
}

function parseUrlStatus(
  raw: FormDataEntryValue | null,
): InternshipUrlStatus | null {
  const value = String(raw ?? "").trim();
  if (
    value === "deep_link" ||
    value === "hub_link" ||
    value === "news_driven" ||
    value === "directory" ||
    value === "homepage"
  ) {
    return value;
  }
  return null;
}

type InternshipFormFields = {
  name: string;
  provider: string;
  section: InternshipSection | null;
  countryCode: string;
  locationLabel: string;
  format: InternshipFormat | null;
  field: string;
  payTier: InternshipPayTier | null;
  payLabel: string;
  duration: string;
  phone: string | null;
  nationalsOnly: boolean;
  officialUrl: string;
  urlStatus: InternshipUrlStatus | null;
  needsReview: boolean;
  isActive: boolean;
  summary: string;
  whatYoullDo: string[];
  whatYoullGain: string[];
  eligibility: string;
  howToApply: string;
  slug: string | null;
};

function parseInternshipFormFields(formData: FormData): InternshipFormFields {
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  return {
    name,
    provider: String(formData.get("provider") ?? "").trim(),
    section: parseSection(formData.get("section")),
    countryCode: String(formData.get("countryCode") ?? "")
      .trim()
      .toUpperCase(),
    locationLabel: String(formData.get("locationLabel") ?? "").trim(),
    format: parseFormat(formData.get("format")),
    field: String(formData.get("field") ?? "").trim(),
    payTier: parsePayTier(formData.get("payTier")),
    payLabel: String(formData.get("payLabel") ?? "").trim(),
    duration: String(formData.get("duration") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim() || null,
    nationalsOnly: String(formData.get("nationalsOnly") ?? "") === "on",
    officialUrl: String(formData.get("officialUrl") ?? "").trim(),
    urlStatus: parseUrlStatus(formData.get("urlStatus")),
    needsReview: String(formData.get("needsReview") ?? "") === "on",
    isActive: String(formData.get("isActive") ?? "") === "on",
    summary: String(formData.get("summary") ?? "").trim(),
    whatYoullDo: parseTextArray(formData.get("whatYoullDo")),
    whatYoullGain: parseTextArray(formData.get("whatYoullGain")),
    eligibility: String(formData.get("eligibility") ?? "").trim(),
    howToApply: String(formData.get("howToApply") ?? "").trim(),
    slug: slugRaw || slugifyInternshipName(name) || null,
  };
}

function validateInternshipFormFields(
  fields: InternshipFormFields,
): { ok: true } | { ok: false; error: string } {
  if (!fields.name) return { ok: false, error: "Internship name is required." };
  if (!fields.provider) return { ok: false, error: "Provider is required." };
  if (!fields.section) return { ok: false, error: "Section is required." };
  if (fields.countryCode.length !== 2) {
    return { ok: false, error: "Select a valid country." };
  }
  if (!fields.locationLabel)
    return { ok: false, error: "Location label is required." };
  if (!fields.format) return { ok: false, error: "Format is required." };
  if (!fields.field) return { ok: false, error: "Field is required." };
  if (!fields.payTier) return { ok: false, error: "Pay tier is required." };
  if (!fields.payLabel) return { ok: false, error: "Pay label is required." };
  if (!fields.duration) return { ok: false, error: "Duration is required." };
  if (!fields.officialUrl)
    return { ok: false, error: "Official URL is required." };
  if (!fields.urlStatus) return { ok: false, error: "URL status is required." };
  if (!fields.summary) return { ok: false, error: "Summary is required." };
  if (!fields.eligibility)
    return { ok: false, error: "Eligibility is required." };
  if (!fields.howToApply)
    return { ok: false, error: "How to apply is required." };
  if (fields.whatYoullDo.length === 0) {
    return {
      ok: false,
      error: "What you'll do is required (one item per line).",
    };
  }
  if (fields.whatYoullGain.length === 0) {
    return {
      ok: false,
      error: "What you'll gain is required (one item per line).",
    };
  }
  return { ok: true };
}

function internshipFieldsToDbPayload(fields: InternshipFormFields) {
  return {
    name: fields.name,
    provider: fields.provider,
    section: fields.section!,
    country_code: fields.countryCode,
    location_label: fields.locationLabel,
    format: fields.format!,
    field: fields.field,
    pay_tier: fields.payTier!,
    pay_label: fields.payLabel,
    duration: fields.duration,
    phone: fields.phone,
    nationals_only: fields.nationalsOnly,
    official_url: fields.officialUrl,
    url_status: fields.urlStatus!,
    needs_review: fields.needsReview,
    is_active: fields.isActive,
    summary: fields.summary,
    what_youll_do: fields.whatYoullDo,
    what_youll_gain: fields.whatYoullGain,
    eligibility: fields.eligibility,
    how_to_apply: fields.howToApply,
    slug: fields.slug!,
  };
}

function revalidateInternshipPaths(internshipId: string) {
  revalidatePath(ADMIN_INTERNSHIPS_HOME);
  revalidatePath(`${ADMIN_INTERNSHIPS_HOME}/${internshipId}`);
}

export async function exportAdminInternshipsExcel(): Promise<ExportAdminInternshipsResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  try {
    const rows = await fetchAdminInternshipsExport();
    return { ok: true, rows };
  } catch (error) {
    console.error("[admin-internships] export", error);
    return { ok: false, error: "Could not export internships." };
  }
}

export async function fetchAdminInternshipFormCountries(): Promise<
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
    console.error("[admin-internships] countries", error);
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

export async function createAdminInternship(
  formData: FormData,
): Promise<CreateAdminInternshipResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const fields = parseInternshipFormFields(formData);
  const validation = validateInternshipFormFields(fields);
  if (!validation.ok) return validation;

  const service = await createSupabaseSecretClient();

  const { data: country } = await service
    .from("countries")
    .select("id")
    .eq("id", fields.countryCode)
    .maybeSingle();

  if (!country) {
    return { ok: false, error: "Selected country is not in the catalog." };
  }

  const usedSlugs = await loadUsedInternshipSlugs(service);
  const resolvedSlug = pickUniqueInternshipSlug(
    fields.slug || slugifyInternshipName(fields.name),
    usedSlugs,
  );
  const fieldsWithSlug = { ...fields, slug: resolvedSlug };

  const { data: created, error: insertError } = await service
    .from("internships")
    .insert({
      ...internshipFieldsToDbPayload(fieldsWithSlug),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !created) {
    console.error("[admin-internships] create", insertError);
    if (insertError?.code === "23505") {
      return {
        ok: false,
        error: "An internship with this slug already exists.",
      };
    }
    return { ok: false, error: "Could not create internship." };
  }

  revalidateInternshipPaths(created.id);
  return { ok: true, internshipId: created.id };
}

export async function updateAdminInternship(
  formData: FormData,
): Promise<AdminInternshipActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const internshipId = String(formData.get("internshipId") ?? "").trim();
  if (!UUID_RE.test(internshipId)) {
    return { ok: false, error: "Invalid internship." };
  }

  const fields = parseInternshipFormFields(formData);
  const validation = validateInternshipFormFields(fields);
  if (!validation.ok) return validation;

  const service = await createSupabaseSecretClient();

  const { data: country } = await service
    .from("countries")
    .select("id")
    .eq("id", fields.countryCode)
    .maybeSingle();

  if (!country) {
    return { ok: false, error: "Selected country is not in the catalog." };
  }

  const { data: existingRow, error: existingFetchError } = await service
    .from("internships")
    .select("slug")
    .eq("id", internshipId)
    .maybeSingle();

  if (existingFetchError) {
    console.error("[admin-internships] update fetch", existingFetchError);
    return { ok: false, error: "Could not load internship." };
  }

  if (!existingRow) {
    return { ok: false, error: "Internship not found." };
  }

  const usedSlugs = await loadUsedInternshipSlugs(service);
  const resolvedSlug = pickUniqueInternshipSlug(
    fields.slug || slugifyInternshipName(fields.name),
    usedSlugs,
    existingRow.slug,
  );
  const fieldsWithSlug = { ...fields, slug: resolvedSlug };

  const { error } = await service
    .from("internships")
    .update({
      ...internshipFieldsToDbPayload(fieldsWithSlug),
      updated_at: new Date().toISOString(),
    })
    .eq("id", internshipId);

  if (error) {
    console.error("[admin-internships] update", error);
    if (error.code === "23505") {
      return {
        ok: false,
        error: "An internship with this slug already exists.",
      };
    }
    return { ok: false, error: "Could not update internship." };
  }

  revalidateInternshipPaths(internshipId);
  return { ok: true };
}

export async function deleteAdminInternship(
  internshipId: string,
): Promise<AdminInternshipActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  if (!UUID_RE.test(internshipId)) {
    return { ok: false, error: "Invalid internship." };
  }

  const service = await createSupabaseSecretClient();

  const { data: internship, error: fetchError } = await service
    .from("internships")
    .select("id, name")
    .eq("id", internshipId)
    .maybeSingle();

  if (fetchError) {
    console.error("[admin-internships] delete fetch", fetchError);
    return { ok: false, error: "Could not load internship." };
  }

  if (!internship) {
    return { ok: false, error: "Internship not found." };
  }

  const { error: activitiesError } = await service
    .from("student_activities")
    .delete()
    .eq("internship_id", internshipId);

  if (activitiesError) {
    console.error("[admin-internships] delete activities", activitiesError);
    return { ok: false, error: "Could not clear student activity links." };
  }

  const { error: deleteError } = await service
    .from("internships")
    .delete()
    .eq("id", internshipId);

  if (deleteError) {
    console.error("[admin-internships] delete", deleteError);
    if (deleteError.code === "23503") {
      return {
        ok: false,
        error:
          "Cannot delete this internship because it is still referenced by other records.",
      };
    }
    return { ok: false, error: "Could not delete internship." };
  }

  revalidatePath(ADMIN_INTERNSHIPS_HOME);
  return { ok: true };
}

export async function setAdminInternshipActive(
  internshipId: string,
  isActive: boolean,
): Promise<AdminInternshipActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  if (!UUID_RE.test(internshipId)) {
    return { ok: false, error: "Invalid internship." };
  }

  const service = await createSupabaseSecretClient();
  const { error } = await service
    .from("internships")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", internshipId);

  if (error) {
    console.error("[admin-internships] set active", error);
    return { ok: false, error: "Could not update internship status." };
  }

  revalidateInternshipPaths(internshipId);
  return { ok: true };
}
