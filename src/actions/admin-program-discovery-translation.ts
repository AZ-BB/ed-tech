"use server";

import type { Json } from "@/database.types";
import {
  getProgramDiscoveryTranslationStatus,
  parseProgramDiscoveryContentAr,
  parseProgramDiscoveryContentArMeta,
  programDiscoverySourceRowFromRow,
  serializeProgramDiscoveryContentAr,
  type ProgramDiscoveryContentAr,
} from "@/lib/program-discovery-translatable-fields";
import type { ProgramsDiscoveryRow } from "@/lib/programs-discovery-types";
import { translateProgramDiscoveryBundleById } from "@/lib/translation/translate-program-discovery-bundle";
import {
  getUniversityProgramTranslationStatus,
  parseUniversityProgramContentAr,
  parseUniversityProgramContentArMeta,
  type UniversityProgramSourceRow,
} from "@/lib/university-program-translatable-fields";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TranslateAdminProgramDiscoveryResult =
  | {
      ok: true;
      translatedCount: number;
      errors: string[];
      universityProgramCount: number;
    }
  | { ok: false; error: string };

export type UpdateAdminProgramDiscoveryArabicContentResult =
  | { ok: true }
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
    console.error("[admin-program-discovery-translation] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return {
      ok: false as const,
      error: "You do not have permission to manage program translations.",
    };
  }

  return { ok: true as const, userId: user.id };
}

function revalidateProgramDiscoveryPaths(programId: string, slug?: string | null) {
  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/programs-discovery/${programId}`);
  revalidatePath("/student/programs");
  if (slug?.trim()) {
    revalidatePath(`/student/programs/${slug.trim()}`);
  }
}

function sanitizeProgramDiscoveryContentAr(
  input: ProgramDiscoveryContentAr,
): ProgramDiscoveryContentAr {
  const out: ProgramDiscoveryContentAr = {};

  for (const key of [
    "title",
    "category",
    "short_description",
    "description",
    "salary_potential",
    "demand_level",
    "math_intensity",
    "ai_resilience",
  ] as const) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim();
    }
  }

  if (Array.isArray(input.tags)) {
    const tags = input.tags
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (tags.length > 0) out.tags = tags;
  }

  const jsonKeys = [
    "career_paths",
    "core_skills",
    "study_plan",
    "day_in_life",
    "salary_regions",
    "career_examples",
    "employers",
    "videos",
  ] as const;

  for (const key of jsonKeys) {
    const value = input[key];
    if (Array.isArray(value) && value.length > 0) {
      (out as Record<string, unknown>)[key] = value;
    }
  }

  return out;
}

export async function translateAdminProgramDiscovery(
  programId: string,
): Promise<TranslateAdminProgramDiscoveryResult> {
  if (!UUID_RE.test(programId)) {
    return { ok: false, error: "Invalid program id." };
  }

  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const supabase = await createSupabaseSecretClient();

  const { data: program, error: programError } = await supabase
    .from("programs_discovery")
    .select("slug")
    .eq("id", programId)
    .maybeSingle();

  if (programError) {
    console.error("[admin-program-discovery-translation] slug lookup", programError);
  }

  const result = await translateProgramDiscoveryBundleById(supabase, programId, {
    requestedBy: access.userId,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidateProgramDiscoveryPaths(programId, program?.slug);
  return {
    ok: true,
    translatedCount: result.totalTranslatedCount,
    errors: result.errors,
    universityProgramCount: result.universityProgramCount,
  };
}

export async function updateAdminProgramDiscoveryArabicContent(
  programId: string,
  contentArInput: ProgramDiscoveryContentAr,
): Promise<UpdateAdminProgramDiscoveryArabicContentResult> {
  if (!UUID_RE.test(programId)) {
    return { ok: false, error: "Invalid program id." };
  }

  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const contentAr = sanitizeProgramDiscoveryContentAr(contentArInput);
  const supabase = await createSupabaseSecretClient();

  const { data: program, error: programError } = await supabase
    .from("programs_discovery")
    .select("slug")
    .eq("id", programId)
    .maybeSingle();

  if (programError) {
    console.error("[admin-program-discovery-translation] slug lookup", programError);
  }

  const { error } = await supabase
    .from("programs_discovery")
    .update({
      content_ar: serializeProgramDiscoveryContentAr(contentAr) as Json,
    })
    .eq("id", programId);

  if (error) {
    console.error("[admin-program-discovery-translation] manual update", error);
    return { ok: false, error: "Could not save Arabic content." };
  }

  revalidateProgramDiscoveryPaths(programId, program?.slug);
  return { ok: true };
}

export type AdminProgramDiscoveryTranslationSummary = {
  universityProgramCount: number;
  universityProgramsTranslated: number;
  universityProgramsOutdated: number;
};

export async function fetchAdminProgramDiscoveryTranslationSummary(
  programId: string,
): Promise<AdminProgramDiscoveryTranslationSummary> {
  const supabase = await createSupabaseSecretClient();

  const { data, error } = await supabase
    .from("university_programs")
    .select(
      "ranking_note, tuition_note, short_description, program_school_note, content_ar, content_ar_meta",
    )
    .eq("program_id", programId);

  if (error) {
    console.error("[admin-program-discovery-translation] uni programs", error);
    return {
      universityProgramCount: 0,
      universityProgramsTranslated: 0,
      universityProgramsOutdated: 0,
    };
  }

  let translated = 0;
  let outdated = 0;

  for (const row of data ?? []) {
    const sourceRow: UniversityProgramSourceRow = {
      ranking_note: row.ranking_note,
      tuition_note: row.tuition_note,
      short_description: row.short_description,
      program_school_note: row.program_school_note,
    };
    const contentAr = parseUniversityProgramContentAr(row.content_ar);
    const meta = parseUniversityProgramContentArMeta(row.content_ar_meta);
    const status = getUniversityProgramTranslationStatus(sourceRow, contentAr, meta);
    if (status === "up_to_date") translated += 1;
    else if (status === "outdated") outdated += 1;
  }

  return {
    universityProgramCount: data?.length ?? 0,
    universityProgramsTranslated: translated,
    universityProgramsOutdated: outdated,
  };
}

export type AdminProgramDiscoveryDetailWithTranslation = ProgramsDiscoveryRow & {
  contentAr: ProgramDiscoveryContentAr;
  contentArTranslatedAt: string | null;
  translationStatus: ReturnType<typeof getProgramDiscoveryTranslationStatus>;
  universityProgramSummary: AdminProgramDiscoveryTranslationSummary;
};

export async function fetchAdminProgramDiscoveryDetailWithTranslation(
  id: string,
): Promise<AdminProgramDiscoveryDetailWithTranslation | null> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("programs_discovery")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[admin-program-discovery] detail", error);
    return null;
  }

  if (!data) return null;

  const row = data as ProgramsDiscoveryRow;
  const contentAr = parseProgramDiscoveryContentAr(row.content_ar ?? null);
  const meta = parseProgramDiscoveryContentArMeta(row.content_ar_meta ?? null);
  const translationStatus = getProgramDiscoveryTranslationStatus(
    programDiscoverySourceRowFromRow(row),
    contentAr,
    meta,
  );
  const universityProgramSummary =
    await fetchAdminProgramDiscoveryTranslationSummary(id);

  return {
    ...row,
    contentAr,
    contentArTranslatedAt: meta?.translated_at ?? null,
    translationStatus,
    universityProgramSummary,
  };
}
