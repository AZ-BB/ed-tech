"use server";

import type { Database, Json } from "@/database.types";
import {
  fetchAdminUniversitiesExport,
  type AdminUniversityExportRow,
} from "@/app/(protected)/admin/content/_lib/fetch-admin-universities-export";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type UniversityDifficulty = Database["public"]["Enums"]["university_difficulty"];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AdminUniversityActionResult = { ok: true } | { ok: false; error: string };

export type AdminCountryOption = { id: string; name: string };

export type ExportAdminUniversitiesResult =
  | { ok: true; rows: AdminUniversityExportRow[] }
  | { ok: false; error: string };

export type CreateAdminUniversityResult =
  | { ok: true; universityId: string }
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
    console.error("[admin-universities] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return {
      ok: false as const,
      error: "You do not have permission to manage universities.",
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

function parseDifficulty(raw: FormDataEntryValue | null): UniversityDifficulty | null {
  const value = String(raw ?? "").trim();
  if (value === "easy" || value === "medium" || value === "hard") return value;
  return null;
}

type UniversityFormFields = {
  name: string;
  city: string;
  state: string | null;
  countryCode: string;
  description: string | null;
  logoUrlManual: string | null;
  coverImageUrlManual: string | null;
  websiteUrl: string | null;
  email: string | null;
  phone: string | null;
  admissionPageUrl: string | null;
  address: string | null;
  satPolicy: string | null;
  method: string | null;
  intakes: string | null;
  deadlineDate: string | null;
  isPublic: boolean;
  isActive: boolean;
  isPriority: boolean;
  isScholarshipAvailable: boolean;
  ranking: number | null;
  acceptanceRate: number | null;
  intlStudents: number | null;
  ieltsMinScore: number | null;
  toeflMinScore: number | null;
  applicationFee: number | null;
  tuitionPerYear: number | null;
  estimatedLivingCostPerYear: number | null;
  difficulty: UniversityDifficulty | null;
  documents: Json | null;
};

function parseUniversityFormFields(formData: FormData): UniversityFormFields {
  const deadlineDateRaw = String(formData.get("deadlineDate") ?? "").trim();

  return {
    name: String(formData.get("name") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    state: String(formData.get("state") ?? "").trim() || null,
    countryCode: String(formData.get("countryCode") ?? "").trim().toUpperCase(),
    description: String(formData.get("description") ?? "").trim() || null,
    logoUrlManual: String(formData.get("logoUrl") ?? "").trim() || null,
    coverImageUrlManual: String(formData.get("coverImageUrl") ?? "").trim() || null,
    websiteUrl: String(formData.get("websiteUrl") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    admissionPageUrl: String(formData.get("admissionPageUrl") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    satPolicy: String(formData.get("satPolicy") ?? "").trim() || null,
    method: String(formData.get("method") ?? "").trim() || null,
    intakes: String(formData.get("intakes") ?? "").trim() || null,
    deadlineDate: deadlineDateRaw.length > 0 ? deadlineDateRaw : null,
    isPublic: String(formData.get("isPublic") ?? "") === "on",
    isActive: String(formData.get("isActive") ?? "") === "on",
    isPriority: String(formData.get("isPriority") ?? "") === "on",
    isScholarshipAvailable: String(formData.get("isScholarshipAvailable") ?? "") === "on",
    ranking: parseOptionalInt(formData.get("ranking")),
    acceptanceRate: parseOptionalInt(formData.get("acceptanceRate")),
    intlStudents: parseOptionalInt(formData.get("intlStudents")),
    ieltsMinScore: parseOptionalFloat(formData.get("ieltsMinScore")),
    toeflMinScore: parseOptionalInt(formData.get("toeflMinScore")),
    applicationFee: parseOptionalFloat(formData.get("applicationFee")),
    tuitionPerYear: parseOptionalFloat(formData.get("tuitionPerYear")),
    estimatedLivingCostPerYear: parseOptionalFloat(
      formData.get("estimatedLivingCostPerYear"),
    ),
    difficulty: parseDifficulty(formData.get("difficulty")),
    documents: parseDocuments(formData.get("documents")),
  };
}

function validateUniversityFormFields(
  fields: UniversityFormFields,
): { ok: true } | { ok: false; error: string } {
  if (!fields.name) return { ok: false, error: "University name is required." };
  if (!fields.city) return { ok: false, error: "City is required." };
  if (fields.countryCode.length !== 2) {
    return { ok: false, error: "Select a valid country." };
  }
  return { ok: true };
}

function universityFieldsToDbPayload(
  fields: UniversityFormFields,
  logoUrl: string | null,
  coverImageUrl: string | null,
) {
  return {
    name: fields.name,
    city: fields.city,
    state: fields.state,
    country_code: fields.countryCode,
    is_public: fields.isPublic,
    is_active: fields.isActive,
    is_priority: fields.isPriority,
    is_scholarship_available: fields.isScholarshipAvailable,
    description: fields.description,
    ranking: fields.ranking,
    logo_url: logoUrl,
    cover_image_url: coverImageUrl,
    acceptance_rate: fields.acceptanceRate,
    intl_students: fields.intlStudents,
    website_url: fields.websiteUrl,
    email: fields.email,
    phone: fields.phone,
    admission_page_url: fields.admissionPageUrl,
    address: fields.address,
    ielts_min_score: fields.ieltsMinScore,
    toefl_min_score: fields.toeflMinScore,
    sat_policy: fields.satPolicy,
    documents: fields.documents,
    deadline_date: fields.deadlineDate,
    method: fields.method,
    application_fee: fields.applicationFee,
    intakes: fields.intakes,
    tuition_per_year: fields.tuitionPerYear,
    estimated_living_cost_per_year: fields.estimatedLivingCostPerYear,
    difficulty: fields.difficulty,
  };
}

function revalidateUniversityPaths(universityId: string) {
  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/universities/${universityId}`);
  revalidatePath(`/student/universities/${universityId}`);
}

export async function exportAdminUniversitiesExcel(): Promise<ExportAdminUniversitiesResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  try {
    const rows = await fetchAdminUniversitiesExport();
    return { ok: true, rows };
  } catch (error) {
    console.error("[admin-universities] export", error);
    return { ok: false, error: "Could not export universities." };
  }
}

export async function fetchAdminUniversityFormCountries(): Promise<
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
    console.error("[admin-universities] countries", error);
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

export async function createAdminUniversity(
  formData: FormData,
): Promise<CreateAdminUniversityResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const fields = parseUniversityFormFields(formData);
  const validation = validateUniversityFormFields(fields);
  if (!validation.ok) return validation;

  const service = await createSupabaseSecretClient();

  const [{ data: existingName }, { data: country }] = await Promise.all([
    service.from("universities").select("id").eq("name", fields.name).maybeSingle(),
    service.from("countries").select("id").eq("id", fields.countryCode).maybeSingle(),
  ]);

  if (existingName) {
    return { ok: false, error: "A university with this name already exists." };
  }

  if (!country) {
    return { ok: false, error: "Selected country is not in the catalog." };
  }

  const { data: created, error: insertError } = await service
    .from("universities")
    .insert({
      ...universityFieldsToDbPayload(
        fields,
        fields.logoUrlManual,
        fields.coverImageUrlManual,
      ),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !created) {
    console.error("[admin-universities] create", insertError);
    return { ok: false, error: "Could not create university." };
  }

  const universityId = created.id;

  revalidateUniversityPaths(universityId);
  return { ok: true, universityId };
}

export async function updateAdminUniversity(
  formData: FormData,
): Promise<AdminUniversityActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const universityId = String(formData.get("universityId") ?? "").trim();
  if (!UUID_RE.test(universityId)) {
    return { ok: false, error: "Invalid university." };
  }

  const fields = parseUniversityFormFields(formData);
  const validation = validateUniversityFormFields(fields);
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

  const { data: nameConflict } = await service
    .from("universities")
    .select("id")
    .eq("name", fields.name)
    .neq("id", universityId)
    .maybeSingle();

  if (nameConflict) {
    return { ok: false, error: "A university with this name already exists." };
  }

  const payload = {
    ...universityFieldsToDbPayload(
      fields,
      fields.logoUrlManual,
      fields.coverImageUrlManual,
    ),
    updated_at: new Date().toISOString(),
  };

  const { error } = await service
    .from("universities")
    .update(payload)
    .eq("id", universityId);

  if (error) {
    console.error("[admin-universities] update", error);
    return { ok: false, error: "Could not update university." };
  }

  revalidateUniversityPaths(universityId);
  return { ok: true };
}

export async function deleteAdminUniversity(
  universityId: string,
): Promise<AdminUniversityActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  if (!UUID_RE.test(universityId)) {
    return { ok: false, error: "Invalid university." };
  }

  const service = await createSupabaseSecretClient();

  const { data: university, error: fetchError } = await service
    .from("universities")
    .select("id, name")
    .eq("id", universityId)
    .maybeSingle();

  if (fetchError) {
    console.error("[admin-universities] delete fetch", fetchError);
    return { ok: false, error: "Could not load university." };
  }

  if (!university) {
    return { ok: false, error: "University not found." };
  }

  const { data: uniMajors, error: uniMajorsError } = await service
    .from("university_majors")
    .select("id")
    .eq("university_id", universityId);

  if (uniMajorsError) {
    console.error("[admin-universities] delete list majors", uniMajorsError);
    return { ok: false, error: "Could not prepare university for deletion." };
  }

  const uniMajorIds = (uniMajors ?? []).map((row) => row.id);

  if (uniMajorIds.length > 0) {
    const { error: programsError } = await service
      .from("university_major_programs")
      .delete()
      .in("university_major_id", uniMajorIds);

    if (programsError) {
      console.error("[admin-universities] delete major programs", programsError);
      return { ok: false, error: "Could not delete university programs." };
    }
  }

  const { error: majorsDeleteError } = await service
    .from("university_majors")
    .delete()
    .eq("university_id", universityId);

  if (majorsDeleteError) {
    console.error("[admin-universities] delete majors", majorsDeleteError);
    return { ok: false, error: "Could not delete university majors." };
  }

  const { error: activitiesError } = await service
    .from("student_activities")
    .delete()
    .eq("uni_id", universityId);

  if (activitiesError) {
    console.error("[admin-universities] delete activities", activitiesError);
    return { ok: false, error: "Could not clear student activity links." };
  }

  const { error: ambassadorsError } = await service
    .from("ambassadors")
    .update({ university_id: null })
    .eq("university_id", universityId);

  if (ambassadorsError) {
    console.error("[admin-universities] delete ambassador links", ambassadorsError);
    return { ok: false, error: "Could not clear ambassador links." };
  }

  const { error: deleteError } = await service
    .from("universities")
    .delete()
    .eq("id", universityId);

  if (deleteError) {
    console.error("[admin-universities] delete", deleteError);
    if (deleteError.code === "23503") {
      return {
        ok: false,
        error:
          "Cannot delete this university because it is still referenced by other records.",
      };
    }
    return { ok: false, error: "Could not delete university." };
  }

  revalidatePath("/admin/content");
  return { ok: true };
}

export async function setAdminUniversityActive(
  universityId: string,
  isActive: boolean,
): Promise<AdminUniversityActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  if (!UUID_RE.test(universityId)) {
    return { ok: false, error: "Invalid university." };
  }

  const service = await createSupabaseSecretClient();
  const { error } = await service
    .from("universities")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", universityId);

  if (error) {
    console.error("[admin-universities] set active", error);
    return { ok: false, error: "Could not update university status." };
  }

  revalidateUniversityPaths(universityId);
  return { ok: true };
}
