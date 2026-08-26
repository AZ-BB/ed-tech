import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/database.types";
import { getLocalizedCountryName } from "@/lib/countries";
import {
  buildTranslatableScholarshipFields,
  destinationsFieldValue,
  destinationsFromFieldValue,
  getScholarshipDestinationLines,
  getScholarshipDocumentLines,
  parseScholarshipContentAr,
  parseScholarshipContentArMeta,
  serializeScholarshipContentAr,
  serializeScholarshipContentArMeta,
  scholarshipCountrySourceHash,
  scholarshipDestinationsSourceHash,
  scholarshipDocumentsSourceHash,
  scholarshipIntakesSourceHash,
  type ScholarshipContentArKey,
  type ScholarshipContentArScalarKey,
} from "@/lib/scholarship-translatable-fields";
import type { TranslationLogContext } from "@/lib/translation/log-translation-response";
import { translateUniversityContentEnToAr } from "@/lib/translation/openai-translation";
import { translateIntakesToArabic } from "@/lib/translation/translate-intakes";

type DbClient = SupabaseClient<Database>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TranslateScholarshipResult =
  | { ok: true; translatedCount: number; errors: string[]; scholarshipName: string }
  | { ok: false; error: string; scholarshipName?: string };

export type TranslateScholarshipOptions = {
  requestedBy?: string | null;
  requestId?: string;
  skipSave?: boolean;
};

export async function translateScholarshipById(
  supabase: DbClient,
  scholarshipId: string,
  options: TranslateScholarshipOptions = {},
): Promise<TranslateScholarshipResult> {
  if (!UUID_RE.test(scholarshipId)) {
    return { ok: false, error: "Invalid scholarship id." };
  }

  const logContext: TranslationLogContext = {
    entityType: "scholarship",
    entityId: scholarshipId,
    requestedBy: options.requestedBy?.trim() || undefined,
    requestId: options.requestId ?? crypto.randomUUID(),
  };

  const { data: scholarship, error } = await supabase
    .from("scholarships")
    .select(
      "id, name, nationality_country_code, description, target_students, level, fields, coverage, competition, tuition, travel, living_stipend, other_benefits, city, academic_eligibility, sat_policy, documents, deadline, method, tooltip, other, intakes, is_renewable, type, discovery_payload, content_ar, content_ar_meta",
    )
    .eq("id", scholarshipId)
    .maybeSingle();

  if (error || !scholarship) {
    if (error) console.error("[translate-scholarship] fetch", error);
    return { ok: false, error: "Scholarship not found." };
  }

  const scholarshipName = scholarship.name?.trim() || scholarshipId;

  const row = {
    name: scholarship.name,
    nationality_country_code: scholarship.nationality_country_code,
    description: scholarship.description,
    target_students: scholarship.target_students,
    level: scholarship.level,
    fields: scholarship.fields,
    coverage: scholarship.coverage,
    competition: scholarship.competition,
    tuition: scholarship.tuition,
    travel: scholarship.travel,
    living_stipend: scholarship.living_stipend,
    other_benefits: scholarship.other_benefits,
    city: scholarship.city,
    academic_eligibility: scholarship.academic_eligibility,
    sat_policy: scholarship.sat_policy,
    documents: scholarship.documents,
    deadline: scholarship.deadline,
    method: scholarship.method,
    tooltip: scholarship.tooltip,
    other: scholarship.other,
    intakes: scholarship.intakes,
    is_renewable: scholarship.is_renewable,
    type: scholarship.type,
    discovery_payload: scholarship.discovery_payload,
  };

  const fields = buildTranslatableScholarshipFields(row);
  const documentLines = getScholarshipDocumentLines(row);
  const destinationLines = getScholarshipDestinationLines(row);

  if (
    fields.length === 0 &&
    documentLines.length === 0 &&
    destinationLines.length === 0 &&
    !row.intakes?.trim() &&
    !row.nationality_country_code?.trim()
  ) {
    return {
      ok: false,
      error: "No translatable English content found for this scholarship.",
      scholarshipName,
    };
  }

  const existingContent = parseScholarshipContentAr(scholarship.content_ar);
  const existingMeta = parseScholarshipContentArMeta(scholarship.content_ar_meta);
  const nextContent = { ...existingContent };
  const fieldHashes: Partial<Record<ScholarshipContentArKey, string>> = {
    ...existingMeta?.field_hashes,
  };
  const errors: string[] = [];
  let translatedCount = 0;

  const fieldsToTranslate: {
    key: ScholarshipContentArScalarKey;
    sourceText: string;
    sourceHash: string;
  }[] = [];

  for (const field of fields) {
    if (field.key === "country") {
      if (scholarship.nationality_country_code?.trim()) {
        continue;
      }
      const countryHash = scholarshipCountrySourceHash(scholarship.nationality_country_code);
      const storedCountryHash = existingMeta?.field_hashes.country;
      if (
        existingContent.country?.trim() &&
        countryHash &&
        storedCountryHash === countryHash
      ) {
        nextContent.country = existingContent.country;
        fieldHashes.country = countryHash;
        continue;
      }
    }

    fieldsToTranslate.push({
      key: field.key,
      sourceText: field.sourceText,
      sourceHash: field.sourceHash,
    });
  }

  const apiFields: { key: string; value: string }[] = fieldsToTranslate.map((field) => ({
    key: field.key,
    value: field.sourceText,
  }));

  if (destinationLines.length > 0) {
    apiFields.push({
      key: "destinations",
      value: destinationsFieldValue(destinationLines),
    });
  }

  if (apiFields.length > 0 || documentLines.length > 0) {
    try {
      const translated = await translateUniversityContentEnToAr(
        {
          fields: apiFields,
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
          nextContent.requiredDocs = translated.documents;
          fieldHashes.requiredDocs = scholarshipDocumentsSourceHash(documentLines);
          translatedCount += translated.documents.length;
        } else {
          errors.push(
            `requiredDocs: Expected ${documentLines.length} translations, got ${translated.documents.length}.`,
          );
        }
      }

      if (destinationLines.length > 0) {
        const destinationsValue = translated.fields.destinations?.trim();
        if (destinationsValue) {
          const parsed = destinationsFromFieldValue(destinationsValue);
          if (parsed.length === destinationLines.length) {
            nextContent.destinations = parsed;
            fieldHashes.destinations = scholarshipDestinationsSourceHash(destinationLines);
            translatedCount += parsed.length;
          } else {
            errors.push(
              `destinations: Expected ${destinationLines.length} translations, got ${parsed.length}.`,
            );
          }
        } else {
          errors.push("destinations: Missing Arabic translation.");
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown translation error";
      errors.push(`content: ${message}`);
      console.error("[translate-scholarship] content", err);
    }
  }

  const intakesAr = translateIntakesToArabic(row.intakes);
  if (intakesAr) {
    nextContent.intakes = intakesAr;
    const intakesHash = scholarshipIntakesSourceHash(row.intakes);
    if (intakesHash) fieldHashes.intakes = intakesHash;
  }

  if (scholarship.nationality_country_code?.trim()) {
    nextContent.country = getLocalizedCountryName(scholarship.nationality_country_code, "ar");
    const countryHash = scholarshipCountrySourceHash(scholarship.nationality_country_code);
    if (countryHash) fieldHashes.country = countryHash;
  }

  if (translatedCount === 0 && !intakesAr && !nextContent.country) {
    return {
      ok: false,
      error: errors[0] ?? "Translation failed for all fields.",
      scholarshipName,
    };
  }

  if (!options.skipSave) {
    const meta = {
      translated_at: new Date().toISOString(),
      field_hashes: fieldHashes,
    };

    const { error: updateError } = await supabase
      .from("scholarships")
      .update({
        content_ar: serializeScholarshipContentAr(nextContent),
        content_ar_meta: serializeScholarshipContentArMeta(meta),
      })
      .eq("id", scholarshipId);

    if (updateError) {
      console.error("[translate-scholarship] update", updateError);
      return {
        ok: false,
        error: "Could not save Arabic translations.",
        scholarshipName,
      };
    }
  }

  return { ok: true, translatedCount, errors, scholarshipName };
}
