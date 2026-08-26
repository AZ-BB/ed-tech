import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/database.types";
import {
  buildScholarshipModalFields,
  parseScholarshipContentAr,
  parseScholarshipContentArMeta,
  serializeScholarshipContentAr,
  serializeScholarshipContentArMeta,
  type ScholarshipModalContentArKey,
  type ScholarshipModalSourceRow,
} from "@/lib/scholarship-translatable-fields";
import type { TranslationLogContext } from "@/lib/translation/log-translation-response";
import { translateUniversityContentEnToAr } from "@/lib/translation/openai-translation";

type DbClient = SupabaseClient<Database>;

const FIELD_KEY_SEP = "::";

export type ScholarshipModalBatchEntry = {
  id: string;
  name: string;
  sat_policy: string | null;
  tooltip: string | null;
  discovery_payload: Json | null;
  content_ar: Json | null;
  content_ar_meta: Json | null;
};

export type ScholarshipModalBatchItemResult =
  | { id: string; ok: true; translatedCount: number; name: string; errors: string[] }
  | { id: string; ok: false; error: string; name: string };

function modalFieldApiKey(scholarshipId: string, fieldKey: ScholarshipModalContentArKey): string {
  return `${scholarshipId}${FIELD_KEY_SEP}${fieldKey}`;
}

function parseModalFieldApiKey(
  key: string,
): { scholarshipId: string; fieldKey: ScholarshipModalContentArKey } | null {
  const idx = key.indexOf(FIELD_KEY_SEP);
  if (idx <= 0) return null;
  const scholarshipId = key.slice(0, idx);
  const fieldKey = key.slice(idx + FIELD_KEY_SEP.length);
  if (fieldKey !== "sat_policy" && fieldKey !== "tooltip") return null;
  return { scholarshipId, fieldKey };
}

function toModalRow(entry: ScholarshipModalBatchEntry): ScholarshipModalSourceRow {
  return {
    sat_policy: entry.sat_policy,
    tooltip: entry.tooltip,
    discovery_payload: entry.discovery_payload,
  };
}

export async function translateScholarshipModalBatch(
  supabase: DbClient,
  entries: ScholarshipModalBatchEntry[],
  options: { requestId?: string } = {},
): Promise<ScholarshipModalBatchItemResult[]> {
  if (entries.length === 0) return [];

  const requestId = options.requestId ?? crypto.randomUUID();
  const prepared = entries.map((entry) => {
    const row = toModalRow(entry);
    const fields = buildScholarshipModalFields(row);
    const existingContent = parseScholarshipContentAr(entry.content_ar);
    const existingMeta = parseScholarshipContentArMeta(entry.content_ar_meta);
    return {
      entry,
      row,
      fields,
      existingContent,
      existingMeta,
      nextContent: { ...existingContent },
      fieldHashes: { ...existingMeta?.field_hashes },
      errors: [] as string[],
    };
  });

  const apiFields: { key: string; value: string }[] = [];
  const fieldLookup = new Map<
    string,
    { scholarshipId: string; fieldKey: ScholarshipModalContentArKey; sourceHash: string }
  >();

  for (const item of prepared) {
    for (const field of item.fields) {
      const apiKey = modalFieldApiKey(item.entry.id, field.key);
      apiFields.push({ key: apiKey, value: field.sourceText });
      fieldLookup.set(apiKey, {
        scholarshipId: item.entry.id,
        fieldKey: field.key,
        sourceHash: field.sourceHash,
      });
    }
  }

  if (apiFields.length === 0) {
    return prepared.map((item) => ({
      id: item.entry.id,
      ok: false as const,
      error: "No SAT/ACT or modal notes content to translate.",
      name: item.entry.name,
    }));
  }

  const logContext: TranslationLogContext = {
    entityType: "scholarship",
    entityId: `batch:${prepared.map((p) => p.entry.id).join(",")}`,
    requestId,
    fieldKey: "modal_fields",
  };

  let translatedFields: Record<string, string> = {};
  try {
    const translated = await translateUniversityContentEnToAr(
      { fields: apiFields, documents: [] },
      logContext,
    );
    translatedFields = translated.fields;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown translation error";
    console.error("[translate-scholarship-modal] batch", err);
    return prepared.map((item) => ({
      id: item.entry.id,
      ok: false as const,
      error: message,
      name: item.entry.name,
    }));
  }

  const translatedCountById = new Map<string, number>();

  for (const [apiKey, value] of Object.entries(translatedFields)) {
    const parsedKey = parseModalFieldApiKey(apiKey);
    const trimmed = value?.trim();
    if (!parsedKey || !trimmed) continue;

    const lookup = fieldLookup.get(apiKey);
    if (!lookup) continue;

    const item = prepared.find((p) => p.entry.id === lookup.scholarshipId);
    if (!item) continue;

    item.nextContent[lookup.fieldKey] = trimmed;
    item.fieldHashes[lookup.fieldKey] = lookup.sourceHash;
    translatedCountById.set(
      lookup.scholarshipId,
      (translatedCountById.get(lookup.scholarshipId) ?? 0) + 1,
    );
  }

  for (const item of prepared) {
    for (const field of item.fields) {
      const apiKey = modalFieldApiKey(item.entry.id, field.key);
      if (!translatedFields[apiKey]?.trim()) {
        item.errors.push(`${field.key}: Missing Arabic translation.`);
      }
    }
  }

  const results: ScholarshipModalBatchItemResult[] = [];

  for (const item of prepared) {
    const translatedCount = translatedCountById.get(item.entry.id) ?? 0;
    const name = item.entry.name?.trim() || item.entry.id;

    if (translatedCount === 0) {
      results.push({
        id: item.entry.id,
        ok: false,
        error: item.errors[0] ?? "Translation failed for all modal fields.",
        name,
      });
      continue;
    }

    const meta = {
      translated_at: new Date().toISOString(),
      field_hashes: item.fieldHashes,
    };

    const { error: updateError } = await supabase
      .from("scholarships")
      .update({
        content_ar: serializeScholarshipContentAr(item.nextContent),
        content_ar_meta: serializeScholarshipContentArMeta(meta),
      })
      .eq("id", item.entry.id);

    if (updateError) {
      console.error("[translate-scholarship-modal] update", item.entry.id, updateError);
      results.push({
        id: item.entry.id,
        ok: false,
        error: "Could not save Arabic modal-field translations.",
        name,
      });
      continue;
    }

    results.push({
      id: item.entry.id,
      ok: true,
      translatedCount,
      name,
      errors: item.errors,
    });
  }

  return results;
}
