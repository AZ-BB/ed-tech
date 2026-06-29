"use server";

import type { Database, Json } from "@/database.types";
import {
  fetchAdminScholarshipsExport,
  type AdminScholarshipExportRow,
} from "@/app/(protected)/admin/content/_lib/fetch-admin-scholarships-export";
import { ADMIN_SCHOLARSHIPS_HOME } from "@/app/(protected)/admin/content/_data/content-tabs-data";
import {
  mergeApplicationUrlIntoDiscoveryPayload,
  normalizeScholarshipApplicationUrl,
} from "@/lib/scholarship-application-url";
import {
  loadUsedDiscoverySlugs,
  pickUniqueDiscoverySlug,
  slugifyScholarshipName,
} from "@/lib/scholarship-discovery-slug";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type ScholarshipType = Database["public"]["Enums"]["scholarship_type"];
type ScholarshipCompetition = Database["public"]["Enums"]["scholarship_competition_type"];
type TuitionType = Database["public"]["Enums"]["tuition_type"];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AdminScholarshipActionResult = { ok: true } | { ok: false; error: string };

export type AdminCountryOption = { id: string; name: string };

export type ExportAdminScholarshipsResult =
  | { ok: true; rows: AdminScholarshipExportRow[] }
  | { ok: false; error: string };

export type CreateAdminScholarshipResult =
  | { ok: true; scholarshipId: string }
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
    console.error("[admin-scholarships] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return {
      ok: false as const,
      error: "You do not have permission to manage scholarships.",
    };
  }

  return { ok: true as const };
}

function parseOptionalInt(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalFloat(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function parseDocuments(raw: FormDataEntryValue | null): Json | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const items = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return items.length > 0 ? items : null;
}

function parseFields(raw: FormDataEntryValue | null): Json | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const items = text
    .split(",")
    .map((line) => line.trim())
    .filter(Boolean);
  return items.length > 0 ? items : null;
}

function parseScholarshipType(raw: FormDataEntryValue | null): ScholarshipType | null {
  const value = String(raw ?? "").trim();
  if (
    value === "government" ||
    value === "university" ||
    value === "corporate" ||
    value === "foundation" ||
    value === "other"
  ) {
    return value;
  }
  return null;
}

function parseCompetition(raw: FormDataEntryValue | null): ScholarshipCompetition | null {
  const value = String(raw ?? "").trim();
  if (value === "low" || value === "medium" || value === "high" || value === "very_high") {
    return value;
  }
  return null;
}

function parseTuitionType(raw: FormDataEntryValue | null): TuitionType | null {
  const value = String(raw ?? "").trim();
  if (value === "full" || value === "partial") return value;
  return null;
}

function parseDestinationCodes(formData: FormData): string[] {
  const fromMulti = formData
    .getAll("destinationCountryCodes")
    .map((entry) => String(entry).trim().toUpperCase().slice(0, 2))
    .filter((c) => c.length === 2);

  if (fromMulti.length > 0) {
    return [...new Set(fromMulti)];
  }

  const text = String(formData.get("destinationCountryCodes") ?? "").trim();
  if (!text) return [];

  return [
    ...new Set(
      text
        .split(",")
        .map((c) => c.trim().toUpperCase().slice(0, 2))
        .filter((c) => c.length === 2),
    ),
  ];
}

type ScholarshipFormFields = {
  name: string;
  nationalityCountryCode: string;
  destinationCountryCodes: string[];
  type: ScholarshipType | null;
  description: string | null;
  targetStudents: string | null;
  level: string | null;
  fields: Json | null;
  isRenewable: boolean;
  isActive: boolean;
  isPriority: boolean;
  coverage: string | null;
  competition: ScholarshipCompetition | null;
  tuitionType: TuitionType | null;
  tuition: string | null;
  travel: string | null;
  livingStipend: string | null;
  otherBenefits: string | null;
  city: string | null;
  academicEligibility: string | null;
  ieltsMinScore: number | null;
  toeflMinScore: number | null;
  satPolicy: string | null;
  documents: Json | null;
  deadlineDate: string | null;
  deadline: string | null;
  applicationFee: number | null;
  intakes: string | null;
  method: string | null;
  other: string | null;
  tooltip: string | null;
  discoverySlug: string | null;
  applicationUrl: string | null;
};

function parseScholarshipFormFields(formData: FormData): ScholarshipFormFields {
  const deadlineDateRaw = String(formData.get("deadlineDate") ?? "").trim();
  const discoverySlugRaw = String(formData.get("discoverySlug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  return {
    name,
    nationalityCountryCode: String(formData.get("nationalityCountryCode") ?? "")
      .trim()
      .toUpperCase(),
    destinationCountryCodes: parseDestinationCodes(formData),
    type: parseScholarshipType(formData.get("type")),
    description: String(formData.get("description") ?? "").trim() || null,
    targetStudents: String(formData.get("targetStudents") ?? "").trim() || null,
    level: String(formData.get("level") ?? "").trim() || null,
    fields: parseFields(formData.get("fields")),
    isRenewable: String(formData.get("isRenewable") ?? "") === "on",
    isActive: String(formData.get("isActive") ?? "") === "on",
    isPriority: String(formData.get("isPriority") ?? "") === "on",
    coverage: String(formData.get("coverage") ?? "").trim() || null,
    competition: parseCompetition(formData.get("competition")),
    tuitionType: parseTuitionType(formData.get("tuitionType")),
    tuition: String(formData.get("tuition") ?? "").trim() || null,
    travel: String(formData.get("travel") ?? "").trim() || null,
    livingStipend: String(formData.get("livingStipend") ?? "").trim() || null,
    otherBenefits: String(formData.get("otherBenefits") ?? "").trim() || null,
    city: String(formData.get("city") ?? "").trim() || null,
    academicEligibility: String(formData.get("academicEligibility") ?? "").trim() || null,
    ieltsMinScore: parseOptionalFloat(formData.get("ieltsMinScore")),
    toeflMinScore: parseOptionalInt(formData.get("toeflMinScore")),
    satPolicy: String(formData.get("satPolicy") ?? "").trim() || null,
    documents: parseDocuments(formData.get("documents")),
    deadlineDate: deadlineDateRaw.length > 0 ? deadlineDateRaw : null,
    deadline: String(formData.get("deadline") ?? "").trim() || null,
    applicationFee: parseOptionalFloat(formData.get("applicationFee")),
    intakes: String(formData.get("intakes") ?? "").trim() || null,
    method: String(formData.get("method") ?? "").trim() || null,
    other: String(formData.get("other") ?? "").trim() || null,
    tooltip: String(formData.get("tooltip") ?? "").trim() || null,
    discoverySlug: discoverySlugRaw || slugifyScholarshipName(name) || null,
    applicationUrl: String(formData.get("applicationUrl") ?? "").trim() || null,
  };
}

function validateScholarshipFormFields(
  fields: ScholarshipFormFields,
): { ok: true } | { ok: false; error: string } {
  if (!fields.name) return { ok: false, error: "Scholarship name is required." };
  if (fields.nationalityCountryCode.length !== 2) {
    return { ok: false, error: "Select a valid eligible nationality." };
  }
  return { ok: true };
}

function scholarshipFieldsToDbPayload(
  fields: ScholarshipFormFields,
  existingDiscoveryPayload: Json | null = null,
) {
  return {
    name: fields.name,
    nationality_country_code: fields.nationalityCountryCode,
    type: fields.type,
    description: fields.description,
    target_students: fields.targetStudents,
    level: fields.level,
    fields: fields.fields,
    is_renewable: fields.isRenewable,
    is_active: fields.isActive,
    is_priority: fields.isPriority,
    coverage: fields.coverage,
    competition: fields.competition,
    tuition_type: fields.tuitionType,
    tuition: fields.tuition,
    travel: fields.travel,
    living_stipend: fields.livingStipend,
    other_benefits: fields.otherBenefits,
    city: fields.city,
    academic_eligibility: fields.academicEligibility,
    ielts_min_score: fields.ieltsMinScore,
    toefl_min_score: fields.toeflMinScore,
    sat_policy: fields.satPolicy,
    documents: fields.documents,
    deadline_date: fields.deadlineDate,
    deadline: fields.deadline,
    application_fee: fields.applicationFee,
    intakes: fields.intakes,
    method: fields.method,
    other: fields.other,
    tooltip: fields.tooltip,
    discovery_slug: fields.discoverySlug,
    application_url: normalizeScholarshipApplicationUrl(fields.applicationUrl) || null,
    discovery_payload: mergeApplicationUrlIntoDiscoveryPayload(
      existingDiscoveryPayload,
      fields.applicationUrl,
      { name: fields.name, slug: fields.discoverySlug ?? undefined },
    ),
  };
}

function revalidateScholarshipPaths(scholarshipId: string) {
  revalidatePath(ADMIN_SCHOLARSHIPS_HOME);
  revalidatePath(`${ADMIN_SCHOLARSHIPS_HOME}/${scholarshipId}`);
}

async function syncScholarshipDestinations(
  service: Awaited<ReturnType<typeof createSupabaseSecretClient>>,
  scholarshipId: string,
  destinationCodes: string[],
) {
  const { error: deleteError } = await service
    .from("scholarship_destinations")
    .delete()
    .eq("scholarship_id", scholarshipId);

  if (deleteError) throw deleteError;

  if (destinationCodes.length === 0) return;

  const { error: insertError } = await service.from("scholarship_destinations").insert(
    destinationCodes.map((country_code) => ({
      scholarship_id: scholarshipId,
      country_code,
    })),
  );

  if (insertError) throw insertError;
}

export async function exportAdminScholarshipsExcel(): Promise<ExportAdminScholarshipsResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  try {
    const rows = await fetchAdminScholarshipsExport();
    return { ok: true, rows };
  } catch (error) {
    console.error("[admin-scholarships] export", error);
    return { ok: false, error: "Could not export scholarships." };
  }
}

export async function fetchAdminScholarshipFormCountries(): Promise<
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
    console.error("[admin-scholarships] countries", error);
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

export async function createAdminScholarship(
  formData: FormData,
): Promise<CreateAdminScholarshipResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const fields = parseScholarshipFormFields(formData);
  const validation = validateScholarshipFormFields(fields);
  if (!validation.ok) return validation;

  const service = await createSupabaseSecretClient();

  const [{ data: existingName }, { data: country }] = await Promise.all([
    service.from("scholarships").select("id").eq("name", fields.name).maybeSingle(),
    service.from("countries").select("id").eq("id", fields.nationalityCountryCode).maybeSingle(),
  ]);

  if (existingName) {
    return { ok: false, error: "A scholarship with this name already exists." };
  }

  if (!country) {
    return { ok: false, error: "Selected nationality is not in the catalog." };
  }

  for (const code of fields.destinationCountryCodes) {
    const { data: destCountry } = await service
      .from("countries")
      .select("id")
      .eq("id", code)
      .maybeSingle();
    if (!destCountry) {
      return { ok: false, error: `Destination country ${code} is not in the catalog.` };
    }
  }

  const usedSlugs = await loadUsedDiscoverySlugs(service);
  const resolvedSlug = pickUniqueDiscoverySlug(
    fields.discoverySlug || slugifyScholarshipName(fields.name),
    usedSlugs,
  );
  const fieldsWithSlug = { ...fields, discoverySlug: resolvedSlug };

  const { data: created, error: insertError } = await service
    .from("scholarships")
    .insert({
      ...scholarshipFieldsToDbPayload(fieldsWithSlug),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !created) {
    console.error("[admin-scholarships] create", insertError);
    return { ok: false, error: "Could not create scholarship." };
  }

  const scholarshipId = created.id;

  try {
    await syncScholarshipDestinations(service, scholarshipId, fields.destinationCountryCodes);
  } catch (error) {
    console.error("[admin-scholarships] create destinations", error);
    return { ok: false, error: "Scholarship created but destinations could not be saved." };
  }

  revalidateScholarshipPaths(scholarshipId);
  return { ok: true, scholarshipId };
}

export async function updateAdminScholarship(
  formData: FormData,
): Promise<AdminScholarshipActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const scholarshipId = String(formData.get("scholarshipId") ?? "").trim();
  if (!UUID_RE.test(scholarshipId)) {
    return { ok: false, error: "Invalid scholarship." };
  }

  const fields = parseScholarshipFormFields(formData);
  const validation = validateScholarshipFormFields(fields);
  if (!validation.ok) return validation;

  const service = await createSupabaseSecretClient();

  const { data: country } = await service
    .from("countries")
    .select("id")
    .eq("id", fields.nationalityCountryCode)
    .maybeSingle();

  if (!country) {
    return { ok: false, error: "Selected nationality is not in the catalog." };
  }

  const { data: nameConflict } = await service
    .from("scholarships")
    .select("id")
    .eq("name", fields.name)
    .neq("id", scholarshipId)
    .maybeSingle();

  if (nameConflict) {
    return { ok: false, error: "A scholarship with this name already exists." };
  }

  for (const code of fields.destinationCountryCodes) {
    const { data: destCountry } = await service
      .from("countries")
      .select("id")
      .eq("id", code)
      .maybeSingle();
    if (!destCountry) {
      return { ok: false, error: `Destination country ${code} is not in the catalog.` };
    }
  }

  const { data: existingRow, error: existingFetchError } = await service
    .from("scholarships")
    .select("discovery_payload, discovery_slug")
    .eq("id", scholarshipId)
    .maybeSingle();

  if (existingFetchError) {
    console.error("[admin-scholarships] update fetch payload", existingFetchError);
    return { ok: false, error: "Could not load scholarship." };
  }

  const usedSlugs = await loadUsedDiscoverySlugs(service);
  const resolvedSlug = pickUniqueDiscoverySlug(
    fields.discoverySlug || slugifyScholarshipName(fields.name),
    usedSlugs,
    existingRow?.discovery_slug,
  );
  const fieldsWithSlug = { ...fields, discoverySlug: resolvedSlug };

  const { error } = await service
    .from("scholarships")
    .update({
      ...scholarshipFieldsToDbPayload(
        fieldsWithSlug,
        existingRow?.discovery_payload ?? null,
      ),
      updated_at: new Date().toISOString(),
    })
    .eq("id", scholarshipId);

  if (error) {
    console.error("[admin-scholarships] update", error);
    return { ok: false, error: "Could not update scholarship." };
  }

  try {
    await syncScholarshipDestinations(service, scholarshipId, fields.destinationCountryCodes);
  } catch (destError) {
    console.error("[admin-scholarships] update destinations", destError);
    return { ok: false, error: "Scholarship updated but destinations could not be saved." };
  }

  revalidateScholarshipPaths(scholarshipId);
  return { ok: true };
}

export async function deleteAdminScholarship(
  scholarshipId: string,
): Promise<AdminScholarshipActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  if (!UUID_RE.test(scholarshipId)) {
    return { ok: false, error: "Invalid scholarship." };
  }

  const service = await createSupabaseSecretClient();

  const { data: scholarship, error: fetchError } = await service
    .from("scholarships")
    .select("id, name")
    .eq("id", scholarshipId)
    .maybeSingle();

  if (fetchError) {
    console.error("[admin-scholarships] delete fetch", fetchError);
    return { ok: false, error: "Could not load scholarship." };
  }

  if (!scholarship) {
    return { ok: false, error: "Scholarship not found." };
  }

  const { error: destinationsError } = await service
    .from("scholarship_destinations")
    .delete()
    .eq("scholarship_id", scholarshipId);

  if (destinationsError) {
    console.error("[admin-scholarships] delete destinations", destinationsError);
    return { ok: false, error: "Could not delete scholarship destinations." };
  }

  const { error: activitiesError } = await service
    .from("student_activities")
    .delete()
    .eq("scholarship_id", scholarshipId);

  if (activitiesError) {
    console.error("[admin-scholarships] delete activities", activitiesError);
    return { ok: false, error: "Could not clear student activity links." };
  }

  const { error: deleteError } = await service
    .from("scholarships")
    .delete()
    .eq("id", scholarshipId);

  if (deleteError) {
    console.error("[admin-scholarships] delete", deleteError);
    if (deleteError.code === "23503") {
      return {
        ok: false,
        error:
          "Cannot delete this scholarship because it is still referenced by other records.",
      };
    }
    return { ok: false, error: "Could not delete scholarship." };
  }

  revalidatePath(ADMIN_SCHOLARSHIPS_HOME);
  return { ok: true };
}

export async function setAdminScholarshipActive(
  scholarshipId: string,
  isActive: boolean,
): Promise<AdminScholarshipActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  if (!UUID_RE.test(scholarshipId)) {
    return { ok: false, error: "Invalid scholarship." };
  }

  const service = await createSupabaseSecretClient();
  const { error } = await service
    .from("scholarships")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", scholarshipId);

  if (error) {
    console.error("[admin-scholarships] set active", error);
    return { ok: false, error: "Could not update scholarship status." };
  }

  revalidateScholarshipPaths(scholarshipId);
  return { ok: true };
}
