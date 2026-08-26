import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/database.types";
import { getLocalizedCountryName } from "@/lib/countries";
import {
  buildTranslatableInternshipFields,
  bulletListFieldValue,
  bulletListFromFieldValue,
  getInternshipWhatYoullDoLines,
  getInternshipWhatYoullGainLines,
  internshipBulletListSourceHash,
  internshipCountrySourceHash,
  parseInternshipContentAr,
  parseInternshipContentArMeta,
  serializeInternshipContentAr,
  serializeInternshipContentArMeta,
  type InternshipContentArKey,
  type InternshipContentArScalarKey,
} from "@/lib/internship-translatable-fields";
import type { TranslationLogContext } from "@/lib/translation/log-translation-response";
import { translateUniversityContentEnToAr } from "@/lib/translation/openai-translation";

type DbClient = SupabaseClient<Database>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TranslateInternshipResult =
  | { ok: true; translatedCount: number; errors: string[]; internshipName: string }
  | { ok: false; error: string; internshipName?: string };

export type TranslateInternshipOptions = {
  requestedBy?: string | null;
  requestId?: string;
  skipSave?: boolean;
};

export async function translateInternshipById(
  supabase: DbClient,
  internshipId: string,
  options: TranslateInternshipOptions = {},
): Promise<TranslateInternshipResult> {
  if (!UUID_RE.test(internshipId)) {
    return { ok: false, error: "Invalid internship id." };
  }

  const logContext: TranslationLogContext = {
    entityType: "internship",
    entityId: internshipId,
    requestedBy: options.requestedBy?.trim() || undefined,
    requestId: options.requestId ?? crypto.randomUUID(),
  };

  const { data: internship, error } = await supabase
    .from("internships")
    .select(
      "id, name, provider, country_code, location_label, field, pay_label, duration, summary, what_youll_do, what_youll_gain, eligibility, how_to_apply, content_ar, content_ar_meta",
    )
    .eq("id", internshipId)
    .maybeSingle();

  if (error || !internship) {
    if (error) console.error("[translate-internship] fetch", error);
    return { ok: false, error: "Internship not found." };
  }

  const internshipName = internship.name?.trim() || internshipId;

  const row = {
    name: internship.name,
    provider: internship.provider,
    country_code: internship.country_code,
    location_label: internship.location_label,
    field: internship.field,
    pay_label: internship.pay_label,
    duration: internship.duration,
    summary: internship.summary,
    what_youll_do: internship.what_youll_do,
    what_youll_gain: internship.what_youll_gain,
    eligibility: internship.eligibility,
    how_to_apply: internship.how_to_apply,
  };

  const fields = buildTranslatableInternshipFields(row);
  const doLines = getInternshipWhatYoullDoLines(row);
  const gainLines = getInternshipWhatYoullGainLines(row);

  if (
    fields.length === 0 &&
    doLines.length === 0 &&
    gainLines.length === 0 &&
    !row.country_code?.trim()
  ) {
    return {
      ok: false,
      error: "No translatable English content found for this internship.",
      internshipName,
    };
  }

  const existingContent = parseInternshipContentAr(internship.content_ar);
  const existingMeta = parseInternshipContentArMeta(internship.content_ar_meta);
  const nextContent = { ...existingContent };
  const fieldHashes: Partial<Record<InternshipContentArKey, string>> = {
    ...existingMeta?.field_hashes,
  };
  const errors: string[] = [];
  let translatedCount = 0;

  const fieldsToTranslate: {
    key: InternshipContentArScalarKey;
    sourceText: string;
    sourceHash: string;
  }[] = [...fields];

  const apiFields: { key: string; value: string }[] = fieldsToTranslate.map((field) => ({
    key: field.key,
    value: field.sourceText,
  }));

  if (gainLines.length > 0) {
    apiFields.push({
      key: "whatYoullGain",
      value: bulletListFieldValue(gainLines),
    });
  }

  if (apiFields.length > 0 || doLines.length > 0) {
    try {
      const translated = await translateUniversityContentEnToAr(
        {
          fields: apiFields,
          documents: doLines,
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

      if (doLines.length > 0) {
        if (translated.documents.length === doLines.length) {
          nextContent.whatYoullDo = translated.documents;
          fieldHashes.whatYoullDo = internshipBulletListSourceHash(doLines);
          translatedCount += translated.documents.length;
        } else {
          errors.push(
            `whatYoullDo: Expected ${doLines.length} translations, got ${translated.documents.length}.`,
          );
        }
      }

      if (gainLines.length > 0) {
        const gainValue = translated.fields.whatYoullGain?.trim();
        if (gainValue) {
          const parsed = bulletListFromFieldValue(gainValue);
          if (parsed.length === gainLines.length) {
            nextContent.whatYoullGain = parsed;
            fieldHashes.whatYoullGain = internshipBulletListSourceHash(gainLines);
            translatedCount += parsed.length;
          } else {
            errors.push(
              `whatYoullGain: Expected ${gainLines.length} translations, got ${parsed.length}.`,
            );
          }
        } else {
          errors.push("whatYoullGain: Missing Arabic translation.");
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown translation error";
      errors.push(`content: ${message}`);
      console.error("[translate-internship] content", err);
    }
  }

  if (internship.country_code?.trim()) {
    nextContent.countryName = getLocalizedCountryName(internship.country_code, "ar");
    const countryHash = internshipCountrySourceHash(internship.country_code);
    if (countryHash) fieldHashes.countryName = countryHash;
  }

  if (translatedCount === 0 && !nextContent.countryName) {
    return {
      ok: false,
      error: errors[0] ?? "Translation failed for all fields.",
      internshipName,
    };
  }

  if (!options.skipSave) {
    const meta = {
      translated_at: new Date().toISOString(),
      field_hashes: fieldHashes,
    };

    const { error: updateError } = await supabase
      .from("internships")
      .update({
        content_ar: serializeInternshipContentAr(nextContent),
        content_ar_meta: serializeInternshipContentArMeta(meta),
      })
      .eq("id", internshipId);

    if (updateError) {
      console.error("[translate-internship] update", updateError);
      return {
        ok: false,
        error: "Could not save Arabic translations.",
        internshipName,
      };
    }
  }

  return { ok: true, translatedCount, errors, internshipName };
}
