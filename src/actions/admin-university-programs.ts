"use server";

import {
  fetchAdminProgramDiscoveryOptions,
  fetchAdminUniversityOptions,
  fetchAdminUniversityProgramsExport,
} from "@/app/(protected)/admin/content/_lib/fetch-admin-university-programs-page";
import { ADMIN_UNIVERSITY_PROGRAMS_HOME } from "@/app/(protected)/admin/content/_data/content-tabs-data";
import type { UniversityProgramExportRow } from "@/lib/university-programs-types";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AdminActionResult = { ok: true } | { ok: false; error: string };

export type ExportAdminUniversityProgramsResult =
  | { ok: true; rows: UniversityProgramExportRow[] }
  | { ok: false; error: string };

export type AdminUniversityProgramFormOptionsResult =
  | {
      ok: true;
      universities: Awaited<ReturnType<typeof fetchAdminUniversityOptions>>;
      programs: Awaited<ReturnType<typeof fetchAdminProgramDiscoveryOptions>>;
    }
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
    console.error("[admin-university-programs] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return {
      ok: false as const,
      error: "You do not have permission to manage university programs.",
    };
  }

  return { ok: true as const };
}

function parseUuid(raw: FormDataEntryValue | null): string | null {
  const value = String(raw ?? "").trim();
  return UUID_RE.test(value) ? value : null;
}

function parseBool(raw: FormDataEntryValue | null, defaultValue: boolean): boolean {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!value) return defaultValue;
  return value === "true" || value === "on" || value === "1" || value === "yes";
}

function buildCreatePayload(formData: FormData) {
  const universityId = parseUuid(formData.get("university_id"));
  const programId = parseUuid(formData.get("program_id"));

  if (!universityId || !programId) return null;

  return {
    university_id: universityId,
    program_id: programId,
    ...buildNotePayload(formData),
    updated_at: new Date().toISOString(),
  };
}

function buildNotePayload(formData: FormData) {
  return {
    ranking_note: String(formData.get("ranking_note") ?? "").trim() || null,
    tuition_note: String(formData.get("tuition_note") ?? "").trim() || null,
    short_description:
      String(formData.get("short_description") ?? "").trim() || null,
    program_school_note:
      String(formData.get("program_school_note") ?? "").trim() || null,
    featured: parseBool(formData.get("featured"), false),
  };
}

export async function getAdminUniversityProgramFormOptions(): Promise<AdminUniversityProgramFormOptionsResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  try {
    const [universities, programs] = await Promise.all([
      fetchAdminUniversityOptions(),
      fetchAdminProgramDiscoveryOptions(),
    ]);
    return { ok: true, universities, programs };
  } catch (error) {
    console.error("[admin-university-programs] form options", error);
    return { ok: false, error: "Could not load form options." };
  }
}

export async function exportAdminUniversityProgramsExcel(): Promise<ExportAdminUniversityProgramsResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  try {
    const rows = await fetchAdminUniversityProgramsExport();
    return { ok: true, rows };
  } catch (error) {
    console.error("[admin-university-programs] export", error);
    return { ok: false, error: "Export failed." };
  }
}

export async function createAdminUniversityProgram(
  formData: FormData,
): Promise<AdminActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const payload = buildCreatePayload(formData);
  if (!payload) {
    return { ok: false, error: "University and program are required." };
  }

  const service = await createSupabaseSecretClient();
  const { error } = await service.from("university_programs").insert(payload);

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "This university already has a link for the selected program.",
      };
    }
    console.error("[admin-university-programs] create", error);
    return { ok: false, error: "Could not create university program link." };
  }

  revalidatePath(ADMIN_UNIVERSITY_PROGRAMS_HOME);
  return { ok: true };
}

export async function updateAdminUniversityProgram(
  formData: FormData,
): Promise<AdminActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const id = parseUuid(formData.get("id"));
  if (!id) return { ok: false, error: "Invalid link id." };

  const payload = {
    ...buildNotePayload(formData),
    updated_at: new Date().toISOString(),
  };

  const service = await createSupabaseSecretClient();
  const { error } = await service
    .from("university_programs")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error("[admin-university-programs] update", error);
    return { ok: false, error: "Could not update university program link." };
  }

  revalidatePath(ADMIN_UNIVERSITY_PROGRAMS_HOME);
  return { ok: true };
}

export async function deleteAdminUniversityProgram(
  id: string,
): Promise<AdminActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  if (!UUID_RE.test(id)) {
    return { ok: false, error: "Invalid link id." };
  }

  const service = await createSupabaseSecretClient();
  const { error } = await service.from("university_programs").delete().eq("id", id);

  if (error) {
    console.error("[admin-university-programs] delete", error);
    return { ok: false, error: "Could not delete university program link." };
  }

  revalidatePath(ADMIN_UNIVERSITY_PROGRAMS_HOME);
  return { ok: true };
}
