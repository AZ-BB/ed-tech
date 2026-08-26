import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/database.types";
import { getLocalizedCountryName } from "@/lib/countries";
import { translateIntakesToArabic } from "@/lib/translation/translate-intakes";
import { translateUniversityMajorProgramCatalog } from "@/lib/translation/translate-major-program-catalog";
import { translateUniversityContentEnToAr } from "@/lib/translation/openai-translation";
import type { TranslationLogContext } from "@/lib/translation/log-translation-response";
import {
  buildTranslatableUniversityFields,
  getUniversityDocumentLines,
  parseUniversityContentAr,
  parseUniversityContentArMeta,
  serializeUniversityContentAr,
  serializeUniversityContentArMeta,
  universityCitySourceHash,
  universityCountrySourceHash,
  universityDocumentsSourceHash,
  universityIntakesSourceHash,
  type UniversityContentArKey,
} from "@/lib/university-translatable-fields";

type DbClient = SupabaseClient<Database>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TranslateUniversityResult =
  | { ok: true; translatedCount: number; errors: string[]; universityName: string }
  | { ok: false; error: string; universityName?: string };

export type TranslateUniversityOptions = {
  requestedBy?: string | null;
  requestId?: string;
  /** When true, skip DB update (still calls OpenAI unless also dry). */
  skipSave?: boolean;
};

export async function translateUniversityById(
  supabase: DbClient,
  universityId: string,
  options: TranslateUniversityOptions = {},
): Promise<TranslateUniversityResult> {
  if (!UUID_RE.test(universityId)) {
    return { ok: false, error: "Invalid university id." };
  }

  const logContext: TranslationLogContext = {
    entityType: "university",
    entityId: universityId,
    requestedBy: options.requestedBy?.trim() || undefined,
    requestId: options.requestId ?? crypto.randomUUID(),
  };

  const { data: university, error } = await supabase
    .from("universities")
    .select(
      "id, name, city, country_code, description, tuition_display, tuition_per_year, living_display, estimated_living_cost_per_year, sat_policy, method, intakes, documents, is_scholarship_available, content_ar, content_ar_meta",
    )
    .eq("id", universityId)
    .maybeSingle();

  if (error || !university) {
    if (error) console.error("[translate-university] fetch", error);
    return { ok: false, error: "University not found." };
  }

  const universityName = university.name?.trim() || universityId;

  const row = {
    name: university.name,
    city: university.city,
    country_code: university.country_code,
    description: university.description,
    tuition_display: university.tuition_display,
    tuition_per_year: university.tuition_per_year,
    living_display: university.living_display,
    estimated_living_cost_per_year: university.estimated_living_cost_per_year,
    sat_policy: university.sat_policy,
    method: university.method,
    intakes: university.intakes,
    documents: university.documents,
    is_scholarship_available: university.is_scholarship_available,
  };

  const fields = buildTranslatableUniversityFields(row);
  const documentLines = getUniversityDocumentLines(row);

  if (
    fields.length === 0 &&
    documentLines.length === 0 &&
    !row.intakes?.trim() &&
    !row.city?.trim() &&
    !row.country_code?.trim()
  ) {
    return {
      ok: false,
      error: "No translatable English content found for this university.",
      universityName,
    };
  }

  const existingContent = parseUniversityContentAr(university.content_ar);
  const existingMeta = parseUniversityContentArMeta(university.content_ar_meta);
  const nextContent = { ...existingContent };
  const fieldHashes: Partial<Record<UniversityContentArKey, string>> = {
    ...existingMeta?.field_hashes,
  };
  const errors: string[] = [];
  let translatedCount = 0;

  const fieldsToTranslate: {
    key: Exclude<UniversityContentArKey, "documents">;
    sourceText: string;
    sourceHash: string;
  }[] = [];

  for (const field of fields) {
    if (field.key === "documents") continue;

    if (field.key === "city") {
      const cityHash = universityCitySourceHash(university.city);
      const storedCityHash = existingMeta?.field_hashes.city;
      if (
        existingContent.city?.trim() &&
        cityHash &&
        storedCityHash === cityHash
      ) {
        nextContent.city = existingContent.city;
        fieldHashes.city = cityHash;
        continue;
      }
    }

    fieldsToTranslate.push({
      key: field.key as Exclude<UniversityContentArKey, "documents">,
      sourceText: field.sourceText,
      sourceHash: field.sourceHash,
    });
  }

  if (fieldsToTranslate.length > 0 || documentLines.length > 0) {
    try {
      const translated = await translateUniversityContentEnToAr(
        {
          fields: fieldsToTranslate.map((field) => ({
            key: field.key,
            value: field.sourceText,
          })),
          documents: documentLines,
        },
        {
          ...logContext,
          fieldKey: "content",
        },
      );

      for (const field of fieldsToTranslate) {
        const value = translated.fields[field.key]?.trim();
        if (!value) {
          errors.push(`${field.key}: Missing Arabic translation.`);
          continue;
        }
        nextContent[field.key] = value;
        fieldHashes[field.key] = field.sourceHash;
        translatedCount += 1;
      }

      if (documentLines.length > 0) {
        if (translated.documents.length === documentLines.length) {
          nextContent.documents = translated.documents;
          fieldHashes.documents = universityDocumentsSourceHash(documentLines);
          translatedCount += translated.documents.length;
        } else {
          errors.push(
            `documents: Expected ${documentLines.length} translations, got ${translated.documents.length}.`,
          );
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown translation error";
      errors.push(`content: ${message}`);
      console.error("[translate-university] content", err);
    }
  }

  const intakesAr = translateIntakesToArabic(row.intakes);
  if (intakesAr) {
    nextContent.intakes = intakesAr;
    const intakesHash = universityIntakesSourceHash(row.intakes);
    if (intakesHash) fieldHashes.intakes = intakesHash;
  }

  if (university.country_code?.trim()) {
    nextContent.country_name = getLocalizedCountryName(university.country_code, "ar");
    const countryHash = universityCountrySourceHash(university.country_code);
    if (countryHash) fieldHashes.country_name = countryHash;
  }

  const catalogTranslation = await translateUniversityMajorProgramCatalog(
    supabase,
    universityId,
    logContext,
  );
  translatedCount += catalogTranslation.translatedCount;
  errors.push(...catalogTranslation.errors);

  if (translatedCount === 0 && !intakesAr && !nextContent.country_name) {
    return {
      ok: false,
      error: errors[0] ?? "Translation failed for all fields.",
      universityName,
    };
  }

  if (!options.skipSave) {
    const meta = {
      translated_at: new Date().toISOString(),
      field_hashes: fieldHashes,
    };

    const { error: updateError } = await supabase
      .from("universities")
      .update({
        content_ar: serializeUniversityContentAr(nextContent),
        content_ar_meta: serializeUniversityContentArMeta(meta),
      })
      .eq("id", universityId);

    if (updateError) {
      console.error("[translate-university] update", updateError);
      return {
        ok: false,
        error: "Could not save Arabic translations.",
        universityName,
      };
    }
  }

  return { ok: true, translatedCount, errors, universityName };
}
