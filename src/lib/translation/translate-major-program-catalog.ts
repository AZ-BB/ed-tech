import type { Locale } from "@/lib/i18n/config";
import { pickLocalizedField } from "@/lib/content-localization";
import { translateCatalogNamesEnToAr } from "@/lib/translation/openai-translation";
import type { TranslationLogContext } from "@/lib/translation/log-translation-response";
import type { Database } from "@/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type DbClient = SupabaseClient<Database>;

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
  supabase: DbClient,
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

  if (majorsToTranslate.size > 0) {
    try {
      const majorItems = [...majorsToTranslate.entries()].map(([id, name]) => ({
        id: String(id),
        name,
      }));
      const translated = await translateCatalogNamesEnToAr("major", majorItems, {
        ...logContext,
        // entityType / entityId set inside translateCatalogNamesEnToAr
        // (entityId = comma-separated major ids)
        fieldKey: "names",
      });

      for (const [majorId] of majorsToTranslate) {
        const nameAr = translated.namesById[String(majorId)]?.trim();
        if (!nameAr) {
          errors.push(`major:${majorId}: Missing Arabic translation.`);
          continue;
        }

        const { error: updateError } = await supabase
          .from("majors")
          .update({ name_ar: nameAr })
          .eq("id", majorId);

        if (updateError) {
          errors.push(`major:${majorId}: ${updateError.message}`);
          console.error(`[major-program-translation] major ${majorId}`, updateError);
          continue;
        }

        translatedCount += 1;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown translation error";
      errors.push(`majors: ${message}`);
      console.error("[major-program-translation] majors batch", err);
    }
  }

  if (programsToTranslate.size > 0) {
    try {
      const programItems = [...programsToTranslate.entries()].map(([id, name]) => ({
        id: String(id),
        name,
      }));
      const translated = await translateCatalogNamesEnToAr("program", programItems, {
        ...logContext,
        fieldKey: "names",
      });

      for (const [programId] of programsToTranslate) {
        const nameAr = translated.namesById[String(programId)]?.trim();
        if (!nameAr) {
          errors.push(`program:${programId}: Missing Arabic translation.`);
          continue;
        }

        const { error: updateError } = await supabase
          .from("programs")
          .update({ name_ar: nameAr })
          .eq("id", programId);

        if (updateError) {
          errors.push(`program:${programId}: ${updateError.message}`);
          console.error(`[major-program-translation] program ${programId}`, updateError);
          continue;
        }

        translatedCount += 1;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown translation error";
      errors.push(`programs: ${message}`);
      console.error("[major-program-translation] programs batch", err);
    }
  }

  return { translatedCount, errors };
}
