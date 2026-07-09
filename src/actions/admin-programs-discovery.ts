"use server";

import {
  fetchAdminProgramsDiscoveryExport,
  type AdminProgramDiscoveryExportRow,
} from "@/app/(protected)/admin/content/_lib/fetch-admin-programs-discovery-export";
import {
  ADMIN_PROGRAMS_DISCOVERY_HOME,
} from "@/app/(protected)/admin/content/_data/content-tabs-data";
import {
  asJson,
  parsePipeList,
  type ProgramsDiscoveryInsert,
} from "@/lib/programs-discovery-types";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AdminProgramActionResult = { ok: true } | { ok: false; error: string };

export type ExportAdminProgramsDiscoveryResult =
  | { ok: true; rows: AdminProgramDiscoveryExportRow[] }
  | { ok: false; error: string };

export type CreateAdminProgramDiscoveryResult =
  | { ok: true; programId: string }
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
    console.error("[admin-programs-discovery] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return {
      ok: false as const,
      error: "You do not have permission to manage programs.",
    };
  }

  return { ok: true as const };
}

function parseProgramId(raw: FormDataEntryValue | null): string | null {
  const value = String(raw ?? "").trim();
  return UUID_RE.test(value) ? value : null;
}

function parseSlug(raw: FormDataEntryValue | null): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseBool(raw: FormDataEntryValue | null, defaultValue: boolean): boolean {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!value) return defaultValue;
  return value === "true" || value === "on" || value === "1" || value === "yes";
}

function parseOptionalJsonField<T>(
  raw: FormDataEntryValue | null,
): T[] | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

function buildProgramPayload(formData: FormData): ProgramsDiscoveryInsert | null {
  const slug = parseSlug(formData.get("slug"));
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();

  if (!slug) return null;
  if (!title) return null;
  if (!category) return null;

  return {
    slug,
    title,
    category,
    short_description: String(formData.get("short_description") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    characteristic_ids:
      parsePipeList(String(formData.get("characteristic_ids") ?? "")) || null,
    tags: parsePipeList(String(formData.get("tags") ?? "")) || null,
    salary_potential:
      String(formData.get("salary_potential") ?? "").trim() || null,
    demand_level: String(formData.get("demand_level") ?? "").trim() || null,
    math_intensity: String(formData.get("math_intensity") ?? "").trim() || null,
    ai_resilience: String(formData.get("ai_resilience") ?? "").trim() || null,
    featured: parseBool(formData.get("featured"), false),
    active: parseBool(formData.get("active"), true),
    career_paths: asJson(parseOptionalJsonField(formData.get("career_paths_json"))),
    core_skills: asJson(parseOptionalJsonField(formData.get("core_skills_json"))),
    study_plan: asJson(parseOptionalJsonField(formData.get("study_plan_json"))),
    day_in_life: asJson(parseOptionalJsonField(formData.get("day_in_life_json"))),
    salary_regions: asJson(parseOptionalJsonField(formData.get("salary_regions_json"))),
    career_examples: asJson(parseOptionalJsonField(formData.get("career_examples_json"))),
    employers: asJson(parseOptionalJsonField(formData.get("employers_json"))),
    videos: asJson(parseOptionalJsonField(formData.get("videos_json"))),
  };
}

function revalidateProgramPaths() {
  revalidatePath(ADMIN_PROGRAMS_DISCOVERY_HOME);
  revalidatePath("/student/programs");
}

export async function exportAdminProgramsDiscoveryExcel(): Promise<ExportAdminProgramsDiscoveryResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  try {
    const rows = await fetchAdminProgramsDiscoveryExport();
    return { ok: true, rows };
  } catch (error) {
    console.error("[admin-programs-discovery] export", error);
    return { ok: false, error: "Could not export programs." };
  }
}

export async function createAdminProgramDiscovery(
  formData: FormData,
): Promise<CreateAdminProgramDiscoveryResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const payload = buildProgramPayload(formData);
  if (!payload) {
    return {
      ok: false,
      error: "Slug, title, and category are required.",
    };
  }

  const secret = await createSupabaseSecretClient();
  const now = new Date().toISOString();

  const { data, error } = await secret
    .from("programs_discovery")
    .insert({ ...payload, created_at: now, updated_at: now })
    .select("id")
    .single();

  if (error) {
    console.error("[admin-programs-discovery] create", error);
    if (error.code === "23505") {
      return { ok: false, error: "A program with this slug already exists." };
    }
    return { ok: false, error: "Could not create program." };
  }

  revalidateProgramPaths();
  return { ok: true, programId: data.id };
}

export async function updateAdminProgramDiscovery(
  formData: FormData,
): Promise<AdminProgramActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const programId = parseProgramId(formData.get("program_id"));
  if (!programId) {
    return { ok: false, error: "Invalid program id." };
  }

  const payload = buildProgramPayload(formData);
  if (!payload) {
    return {
      ok: false,
      error: "Slug, title, and category are required.",
    };
  }

  const secret = await createSupabaseSecretClient();
  const { error } = await secret
    .from("programs_discovery")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", programId);

  if (error) {
    console.error("[admin-programs-discovery] update", error);
    if (error.code === "23505") {
      return { ok: false, error: "A program with this slug already exists." };
    }
    return { ok: false, error: "Could not update program." };
  }

  revalidateProgramPaths();
  revalidatePath(`${ADMIN_PROGRAMS_DISCOVERY_HOME}/${programId}`);
  return { ok: true };
}

export async function deleteAdminProgramDiscovery(
  programId: string,
): Promise<AdminProgramActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  if (!parseProgramId(programId)) {
    return { ok: false, error: "Invalid program id." };
  }

  const secret = await createSupabaseSecretClient();
  const { error } = await secret
    .from("programs_discovery")
    .delete()
    .eq("id", programId);

  if (error) {
    console.error("[admin-programs-discovery] delete", error);
    return { ok: false, error: "Could not delete program." };
  }

  revalidateProgramPaths();
  return { ok: true };
}

export async function setAdminProgramDiscoveryActive(
  programId: string,
  active: boolean,
): Promise<AdminProgramActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  if (!parseProgramId(programId)) {
    return { ok: false, error: "Invalid program id." };
  }

  const secret = await createSupabaseSecretClient();
  const { error } = await secret
    .from("programs_discovery")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", programId);

  if (error) {
    console.error("[admin-programs-discovery] set active", error);
    return { ok: false, error: "Could not update program status." };
  }

  revalidateProgramPaths();
  revalidatePath(`${ADMIN_PROGRAMS_DISCOVERY_HOME}/${programId}`);
  return { ok: true };
}
