import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/database.types";
import type { TranslationLogContext } from "@/lib/translation/log-translation-response";
import { translateUniversityContentEnToAr } from "@/lib/translation/openai-translation";
import {
  applyFlatTranslationsToUniversityProgramContentAr,
  buildTranslatableUniversityProgramFields,
  chunkUniversityProgramTranslatableFields,
  parseUniversityProgramContentAr,
  parseUniversityProgramContentArMeta,
  serializeUniversityProgramContentAr,
  serializeUniversityProgramContentArMeta,
  type UniversityProgramSourceRow,
} from "@/lib/university-program-translatable-fields";

type DbClient = SupabaseClient<Database>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TranslateUniversityProgramResult =
  | {
      ok: true;
      translatedCount: number;
      errors: string[];
      linkId: string;
    }
  | { ok: false; error: string; linkId?: string };

export type TranslateUniversityProgramOptions = {
  requestedBy?: string | null;
  requestId?: string;
  skipSave?: boolean;
};

async function translateUniversityProgramRow(
  supabase: DbClient,
  row: {
    id: string;
    ranking_note: string | null;
    tuition_note: string | null;
    short_description: string | null;
    program_school_note: string | null;
    content_ar: Database["public"]["Tables"]["university_programs"]["Row"]["content_ar"];
    content_ar_meta: Database["public"]["Tables"]["university_programs"]["Row"]["content_ar_meta"];
  },
  logContext: TranslationLogContext,
  options: TranslateUniversityProgramOptions,
): Promise<TranslateUniversityProgramResult> {
  const linkId = row.id;
  const sourceRow: UniversityProgramSourceRow = {
    ranking_note: row.ranking_note,
    tuition_note: row.tuition_note,
    short_description: row.short_description,
    program_school_note: row.program_school_note,
  };

  const allFields = buildTranslatableUniversityProgramFields(sourceRow);
  if (allFields.length === 0) {
    return { ok: true, translatedCount: 0, errors: [], linkId };
  }

  const existingContent = parseUniversityProgramContentAr(row.content_ar);
  const existingMeta = parseUniversityProgramContentArMeta(row.content_ar_meta);
  let nextContent = { ...existingContent };
  const fieldHashes: Record<string, string> = { ...existingMeta?.field_hashes };
  const errors: string[] = [];
  let translatedCount = 0;

  const fieldsToTranslate = allFields.filter((field) => {
    const storedHash = existingMeta?.field_hashes[field.key];
    return storedHash !== field.sourceHash;
  });

  if (fieldsToTranslate.length === 0) {
    return { ok: true, translatedCount: 0, errors: [], linkId };
  }

  const chunks = chunkUniversityProgramTranslatableFields(fieldsToTranslate);

  for (const chunk of chunks) {
    try {
      const translated = await translateUniversityContentEnToAr(
        {
          fields: chunk.map((field) => ({ key: field.key, value: field.sourceText })),
          documents: [],
        },
        {
          ...logContext,
          entityId: linkId,
          fieldKey: "content",
        },
      );

      const flatTranslations: Record<string, string> = {};
      for (const field of chunk) {
        const value = translated.fields[field.key]?.trim();
        if (!value) {
          errors.push(`${field.key}: Missing Arabic translation.`);
          continue;
        }
        flatTranslations[field.key] = value;
        fieldHashes[field.key] = field.sourceHash;
        translatedCount += 1;
      }

      nextContent = applyFlatTranslationsToUniversityProgramContentAr(
        nextContent,
        flatTranslations,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown translation error";
      errors.push(`chunk: ${message}`);
      console.error("[translate-university-program] chunk", err);
    }
  }

  if (translatedCount === 0) {
    return {
      ok: false,
      error: errors[0] ?? "Translation failed for all fields.",
      linkId,
    };
  }

  if (!options.skipSave) {
    const meta = {
      translated_at: new Date().toISOString(),
      field_hashes: fieldHashes,
    };

    const { error: updateError } = await supabase
      .from("university_programs")
      .update({
        content_ar: serializeUniversityProgramContentAr(nextContent),
        content_ar_meta: serializeUniversityProgramContentArMeta(meta),
      })
      .eq("id", linkId);

    if (updateError) {
      console.error("[translate-university-program] update", updateError);
      return {
        ok: false,
        error: "Could not save Arabic translations.",
        linkId,
      };
    }
  }

  return { ok: true, translatedCount, errors, linkId };
}

export async function translateUniversityProgramById(
  supabase: DbClient,
  linkId: string,
  options: TranslateUniversityProgramOptions = {},
): Promise<TranslateUniversityProgramResult> {
  if (!UUID_RE.test(linkId)) {
    return { ok: false, error: "Invalid university program id." };
  }

  const logContext: TranslationLogContext = {
    entityType: "university_program",
    entityId: linkId,
    requestedBy: options.requestedBy?.trim() || undefined,
    requestId: options.requestId ?? crypto.randomUUID(),
  };

  const { data: row, error } = await supabase
    .from("university_programs")
    .select(
      "id, ranking_note, tuition_note, short_description, program_school_note, content_ar, content_ar_meta",
    )
    .eq("id", linkId)
    .maybeSingle();

  if (error || !row) {
    if (error) console.error("[translate-university-program] fetch", error);
    return { ok: false, error: "University program not found." };
  }

  return translateUniversityProgramRow(supabase, row, logContext, options);
}

export async function translateUniversityProgramsForProgramId(
  supabase: DbClient,
  programId: string,
  options: TranslateUniversityProgramOptions = {},
): Promise<{
  results: TranslateUniversityProgramResult[];
  totalTranslatedCount: number;
  errors: string[];
}> {
  if (!UUID_RE.test(programId)) {
    return {
      results: [{ ok: false, error: "Invalid program id." }],
      totalTranslatedCount: 0,
      errors: ["Invalid program id."],
    };
  }

  const requestId = options.requestId ?? crypto.randomUUID();
  const logContext: TranslationLogContext = {
    entityType: "university_program",
    requestedBy: options.requestedBy?.trim() || undefined,
    requestId,
  };

  const { data, error } = await supabase
    .from("university_programs")
    .select(
      "id, ranking_note, tuition_note, short_description, program_school_note, content_ar, content_ar_meta",
    )
    .eq("program_id", programId);

  if (error) {
    console.error("[translate-university-program] list", error);
    return {
      results: [{ ok: false, error: "Could not load university programs." }],
      totalTranslatedCount: 0,
      errors: ["Could not load university programs."],
    };
  }

  const results: TranslateUniversityProgramResult[] = [];
  const errors: string[] = [];
  let totalTranslatedCount = 0;

  for (const row of data ?? []) {
    const result = await translateUniversityProgramRow(
      supabase,
      row,
      logContext,
      { ...options, requestId },
    );
    results.push(result);
    if (result.ok) {
      totalTranslatedCount += result.translatedCount;
      errors.push(...result.errors);
    } else {
      errors.push(result.error);
    }
  }

  return { results, totalTranslatedCount, errors };
}
