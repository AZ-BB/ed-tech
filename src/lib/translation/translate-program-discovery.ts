import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/database.types";
import {
  applyFlatTranslationsToProgramDiscoveryContentAr,
  buildTranslatableProgramDiscoveryFields,
  chunkProgramDiscoveryTranslatableFields,
  parseProgramDiscoveryContentAr,
  parseProgramDiscoveryContentArMeta,
  programDiscoverySourceRowFromRow,
  serializeProgramDiscoveryContentAr,
  serializeProgramDiscoveryContentArMeta,
  type ProgramDiscoverySourceRow,
} from "@/lib/program-discovery-translatable-fields";
import type { ProgramsDiscoveryRow } from "@/lib/programs-discovery-types";
import type { TranslationLogContext } from "@/lib/translation/log-translation-response";
import { translateUniversityContentEnToAr } from "@/lib/translation/openai-translation";

type DbClient = SupabaseClient<Database>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TranslateProgramDiscoveryResult =
  | { ok: true; translatedCount: number; errors: string[]; programTitle: string }
  | { ok: false; error: string; programTitle?: string };

export type TranslateProgramDiscoveryOptions = {
  requestedBy?: string | null;
  requestId?: string;
  skipSave?: boolean;
};

export async function translateProgramDiscoveryById(
  supabase: DbClient,
  programId: string,
  options: TranslateProgramDiscoveryOptions = {},
): Promise<TranslateProgramDiscoveryResult> {
  if (!UUID_RE.test(programId)) {
    return { ok: false, error: "Invalid program id." };
  }

  const logContext: TranslationLogContext = {
    entityType: "program_discovery",
    entityId: programId,
    requestedBy: options.requestedBy?.trim() || undefined,
    requestId: options.requestId ?? crypto.randomUUID(),
  };

  const { data: program, error } = await supabase
    .from("programs_discovery")
    .select("*")
    .eq("id", programId)
    .maybeSingle();

  if (error || !program) {
    if (error) console.error("[translate-program-discovery] fetch", error);
    return { ok: false, error: "Program not found." };
  }

  const row = program as ProgramsDiscoveryRow;
  const programTitle = row.title?.trim() || programId;
  const sourceRow: ProgramDiscoverySourceRow = programDiscoverySourceRowFromRow(row);

  const allFields = buildTranslatableProgramDiscoveryFields(sourceRow);
  if (allFields.length === 0) {
    return { ok: true, translatedCount: 0, errors: [], programTitle };
  }

  const existingContent = parseProgramDiscoveryContentAr(program.content_ar);
  const existingMeta = parseProgramDiscoveryContentArMeta(program.content_ar_meta);
  let nextContent = { ...existingContent };
  const fieldHashes: Record<string, string> = { ...existingMeta?.field_hashes };
  const errors: string[] = [];
  let translatedCount = 0;

  const fieldsToTranslate = allFields.filter((field) => {
    const storedHash = existingMeta?.field_hashes[field.key];
    return storedHash !== field.sourceHash;
  });

  if (fieldsToTranslate.length === 0) {
    return { ok: true, translatedCount: 0, errors: [], programTitle };
  }

  const chunks = chunkProgramDiscoveryTranslatableFields(fieldsToTranslate);

  for (const chunk of chunks) {
    try {
      const translated = await translateUniversityContentEnToAr(
        {
          fields: chunk.map((field) => ({ key: field.key, value: field.sourceText })),
          documents: [],
        },
        {
          ...logContext,
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

      nextContent = applyFlatTranslationsToProgramDiscoveryContentAr(
        nextContent,
        flatTranslations,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown translation error";
      errors.push(`chunk: ${message}`);
      console.error("[translate-program-discovery] chunk", err);
    }
  }

  if (translatedCount === 0) {
    return {
      ok: false,
      error: errors[0] ?? "Translation failed for all fields.",
      programTitle,
    };
  }

  if (!options.skipSave) {
    const meta = {
      translated_at: new Date().toISOString(),
      field_hashes: fieldHashes,
    };

    const { error: updateError } = await supabase
      .from("programs_discovery")
      .update({
        content_ar: serializeProgramDiscoveryContentAr(nextContent),
        content_ar_meta: serializeProgramDiscoveryContentArMeta(meta),
      })
      .eq("id", programId);

    if (updateError) {
      console.error("[translate-program-discovery] update", updateError);
      return {
        ok: false,
        error: "Could not save Arabic translations.",
        programTitle,
      };
    }
  }

  return { ok: true, translatedCount, errors, programTitle };
}
