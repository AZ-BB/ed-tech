import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/database.types";
import {
  applyFlatTranslationsToModuleContentAr,
  buildTranslatableDiscoveryModuleFields,
  chunkTranslatableFields,
  parseDiscoveryContentArMeta,
  parseDiscoveryModuleContentAr,
  serializeDiscoveryContentArMeta,
  serializeDiscoveryModuleContentAr,
  type DiscoveryModuleSourceRow,
} from "@/lib/discovery-translatable-fields";
import type { TranslationLogContext } from "@/lib/translation/log-translation-response";
import { translateUniversityContentEnToAr } from "@/lib/translation/openai-translation";

type DbClient = SupabaseClient<Database>;

export type TranslateDiscoveryModuleResult =
  | { ok: true; translatedCount: number; errors: string[]; moduleTitle: string }
  | { ok: false; error: string; moduleTitle?: string };

export type TranslateDiscoveryModuleOptions = {
  requestedBy?: string | null;
  requestId?: string;
  skipSave?: boolean;
};

export async function translateDiscoveryModuleById(
  supabase: DbClient,
  moduleId: string,
  options: TranslateDiscoveryModuleOptions = {},
): Promise<TranslateDiscoveryModuleResult> {
  const trimmedId = moduleId?.trim();
  if (!trimmedId) {
    return { ok: false, error: "Invalid module id." };
  }

  const logContext: TranslationLogContext = {
    entityType: "discovery_module",
    entityId: trimmedId,
    requestedBy: options.requestedBy?.trim() || undefined,
    requestId: options.requestId ?? crypto.randomUUID(),
  };

  const { data: module, error } = await supabase
    .from("discovery_modules")
    .select("id, title, subtitle, description, content_json, content_ar, content_ar_meta")
    .eq("id", trimmedId)
    .maybeSingle();

  if (error || !module) {
    if (error) console.error("[translate-discovery-module] fetch", error);
    return { ok: false, error: "Module not found." };
  }

  const moduleTitle = module.title?.trim() || trimmedId;

  const row: DiscoveryModuleSourceRow = {
    id: module.id,
    title: module.title,
    subtitle: module.subtitle,
    description: module.description,
    content_json: module.content_json,
  };

  const allFields = buildTranslatableDiscoveryModuleFields(row);
  if (allFields.length === 0) {
    return {
      ok: false,
      error: "No translatable English content found for this module.",
      moduleTitle,
    };
  }

  const existingContent = parseDiscoveryModuleContentAr(module.content_ar);
  const existingMeta = parseDiscoveryContentArMeta(module.content_ar_meta);
  let nextContent = { ...existingContent };
  const fieldHashes: Record<string, string> = { ...existingMeta?.field_hashes };
  const errors: string[] = [];
  let translatedCount = 0;

  const fieldsToTranslate = allFields.filter((field) => {
    const storedHash = existingMeta?.field_hashes[field.key];
    return storedHash !== field.sourceHash;
  });

  if (fieldsToTranslate.length === 0) {
    return { ok: true, translatedCount: 0, errors: [], moduleTitle };
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

      nextContent = applyFlatTranslationsToModuleContentAr(nextContent, flatTranslations);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown translation error";
      errors.push(`chunk: ${message}`);
      console.error("[translate-discovery-module] chunk", err);
    }
  }

  if (translatedCount === 0) {
    return {
      ok: false,
      error: errors[0] ?? "Translation failed for all fields.",
      moduleTitle,
    };
  }

  if (!options.skipSave) {
    const meta = {
      translated_at: new Date().toISOString(),
      field_hashes: fieldHashes,
    };

    const { error: updateError } = await supabase
      .from("discovery_modules")
      .update({
        content_ar: serializeDiscoveryModuleContentAr(nextContent),
        content_ar_meta: serializeDiscoveryContentArMeta(meta),
      })
      .eq("id", trimmedId);

    if (updateError) {
      console.error("[translate-discovery-module] update", updateError);
      return {
        ok: false,
        error: "Could not save Arabic translations.",
        moduleTitle,
      };
    }
  }

  return { ok: true, translatedCount, errors, moduleTitle };
}
