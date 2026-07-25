import type { Locale } from "@/lib/i18n/config";
import { pickLocalizedField } from "@/lib/content-localization";
import { translateTextEnToAr } from "@/lib/translation/agrid-api";
import type { TranslationLogContext } from "@/lib/translation/log-translation-response";
import type { createSupabaseSecretClient } from "@/utils/supabase-server";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

type CatalogMajorRow = {
  id: number;
  name: string;
  name_ar: string | null;
};

type CatalogProgramRow = {
  id: number;
  name: string;
  name_ar: string | null;
};

type UniversityMajorProgramLink = {
  majors: CatalogMajorRow | null;
  university_major_programs: { programs: CatalogProgramRow | null }[] | null;
};

export function pickCatalogName(
  locale: Locale,
  englishName: string | null | undefined,
  arabicName: string | null | undefined,
  fallback = "Program area",
): string {
  const en = englishName?.trim() || fallback;
  return pickLocalizedField(locale, en, arabicName?.trim()) || en;
}

export async function translateUniversityMajorProgramCatalog(
  supabase: SupabaseClient,
  universityId: string,
  logContext: TranslationLogContext,
): Promise<{ translatedCount: number; errors: string[] }> {
  const { data, error } = await supabase
    .from("university_majors")
    .select(
      `
      majors ( id, name, name_ar ),
      university_major_programs (
        programs ( id, name, name_ar )
      )
    `,
    )
    .eq("university_id", universityId);

  if (error) {
    console.error("[major-program-translation] fetch links", error);
    return { translatedCount: 0, errors: ["Could not load majors and programs for this university."] };
  }

  const majorsToTranslate = new Map<number, string>();
  const programsToTranslate = new Map<number, string>();

  for (const row of (data ?? []) as UniversityMajorProgramLink[]) {
    const major = row.majors;
    if (major?.id && major.name?.trim() && !major.name_ar?.trim()) {
      majorsToTranslate.set(major.id, major.name.trim());
    }

    for (const link of row.university_major_programs ?? []) {
      const program = link.programs;
      if (program?.id && program.name?.trim() && !program.name_ar?.trim()) {
        programsToTranslate.set(program.id, program.name.trim());
      }
    }
  }

  const errors: string[] = [];
  let translatedCount = 0;

  for (const [majorId, name] of majorsToTranslate) {
    try {
      const nameAr = await translateTextEnToAr(name, {
        ...logContext,
        entityType: "major",
        entityId: String(majorId),
        fieldKey: "name",
      });

      const { error: updateError } = await supabase
        .from("majors")
        .update({ name_ar: nameAr })
        .eq("id", majorId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      translatedCount += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown translation error";
      errors.push(`major:${majorId}: ${message}`);
      console.error(`[major-program-translation] major ${majorId}`, err);
    }
  }

  for (const [programId, name] of programsToTranslate) {
    try {
      const nameAr = await translateTextEnToAr(name, {
        ...logContext,
        entityType: "program",
        entityId: String(programId),
        fieldKey: "name",
      });

      const { error: updateError } = await supabase
        .from("programs")
        .update({ name_ar: nameAr })
        .eq("id", programId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      translatedCount += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown translation error";
      errors.push(`program:${programId}: ${message}`);
      console.error(`[major-program-translation] program ${programId}`, err);
    }
  }

  return { translatedCount, errors };
}
