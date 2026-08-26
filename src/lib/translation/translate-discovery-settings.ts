import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/database.types";
import {
  applyFlatTranslationsToSettingsContentAr,
  buildTranslatableDiscoverySettingsFields,
  chunkTranslatableFields,
  parseDiscoveryContentArMeta,
  parseDiscoverySettingsContentAr,
  serializeDiscoveryContentArMeta,
  serializeDiscoverySettingsContentAr,
  type DiscoverySettingsSourceRow,
} from "@/lib/discovery-translatable-fields";
import type { TranslationLogContext } from "@/lib/translation/log-translation-response";
import { translateUniversityContentEnToAr } from "@/lib/translation/openai-translation";

type DbClient = SupabaseClient<Database>;

const SETTINGS_ID = "default";

export type TranslateDiscoverySettingsResult =
  | { ok: true; translatedCount: number; errors: string[] }
  | { ok: false; error: string };

export type TranslateDiscoverySettingsOptions = {
  requestedBy?: string | null;
  requestId?: string;
  skipSave?: boolean;
};

export async function translateDiscoverySettings(
  supabase: DbClient,
  options: TranslateDiscoverySettingsOptions = {},
): Promise<TranslateDiscoverySettingsResult> {
  const logContext: TranslationLogContext = {
    entityType: "discovery_settings",
    entityId: SETTINGS_ID,
    requestedBy: options.requestedBy?.trim() || undefined,
    requestId: options.requestId ?? crypto.randomUUID(),
  };

  const { data: settings, error } = await supabase
    .from("discovery_settings")
    .select("id, scales_json, combined_profiles_json, content_ar, content_ar_meta")
    .eq("id", SETTINGS_ID)
    .maybeSingle();

  if (error || !settings) {
    if (error) console.error("[translate-discovery-settings] fetch", error);
    return { ok: false, error: "Discovery settings not found." };
  }

  const row: DiscoverySettingsSourceRow = {
    scales_json: settings.scales_json,
    combined_profiles_json: settings.combined_profiles_json,
  };

  const allFields = buildTranslatableDiscoverySettingsFields(row);
  if (allFields.length === 0) {
    return { ok: false, error: "No translatable English content found in discovery settings." };
  }

  const existingContent = parseDiscoverySettingsContentAr(settings.content_ar);
  const existingMeta = parseDiscoveryContentArMeta(settings.content_ar_meta);
  let nextContent = { ...existingContent };
  const fieldHashes: Record<string, string> = { ...existingMeta?.field_hashes };
  const errors: string[] = [];
  let translatedCount = 0;

  const fieldsToTranslate = allFields.filter((field) => {
    const storedHash = existingMeta?.field_hashes[field.key];
    return storedHash !== field.sourceHash;
  });

  if (fieldsToTranslate.length === 0) {
    return { ok: true, translatedCount: 0, errors: [] };
  }

  const chunks = chunkTranslatableFields(fieldsToTranslate);

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

      nextContent = applyFlatTranslationsToSettingsContentAr(nextContent, flatTranslations);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown translation error";
      errors.push(`chunk: ${message}`);
      console.error("[translate-discovery-settings] chunk", err);
    }
  }

  if (translatedCount === 0) {
    return {
      ok: false,
      error: errors[0] ?? "Translation failed for all fields.",
    };
  }

  if (!options.skipSave) {
    const meta = {
      translated_at: new Date().toISOString(),
      field_hashes: fieldHashes,
    };

    const { error: updateError } = await supabase
      .from("discovery_settings")
      .update({
        content_ar: serializeDiscoverySettingsContentAr(nextContent),
        content_ar_meta: serializeDiscoveryContentArMeta(meta),
      })
      .eq("id", SETTINGS_ID);

    if (updateError) {
      console.error("[translate-discovery-settings] update", updateError);
      return { ok: false, error: "Could not save Arabic translations." };
    }
  }

  return { ok: true, translatedCount, errors };
}
