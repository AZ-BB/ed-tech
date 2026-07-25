import type { Locale } from "@/lib/i18n/config";
import { getLocalizedCountryName } from "@/lib/countries";
import { translateIntakesToArabic } from "@/lib/translation/translate-intakes";
import {
  parseUniversityContentAr,
  type UniversityContentAr,
  type UniversitySourceRow,
} from "@/lib/university-translatable-fields";
import type { Json } from "@/database.types";
import {
  livingCostLabel,
  tuitionCardLabel,
  tuitionDetailLabel,
  tuitionSentenceLabel,
} from "@/lib/university-cost-display";

export function pickLocalizedField(
  locale: Locale,
  enValue: string | null | undefined,
  arValue: string | null | undefined,
): string {
  const en = enValue?.trim() ?? "";
  const ar = arValue?.trim() ?? "";
  if (locale === "ar" && ar) return ar;
  return en;
}

export function pickLocalizedDocuments(
  locale: Locale,
  enDocs: string[],
  arDocs: string[] | undefined,
): string[] {
  if (locale === "ar" && arDocs && arDocs.length > 0) return arDocs;
  return enDocs;
}

export function hasArabicUniversityContent(contentAr: UniversityContentAr | null | undefined): boolean {
  if (!contentAr) return false;
  return Object.keys(contentAr).length > 0;
}

export type LocalizedUniversityDisplay = {
  name: string;
  city: string;
  countryName: string;
  description: string | null;
  tuitionDisplay: string;
  tuitionSentence: string;
  livingFormatted: string;
  satPolicy: string | null;
  methodFormatted: string;
  intakesFormatted: string;
  documents: string[];
  scholarshipNote: string | null;
  useRtlContent: boolean;
};

export function applyUniversityLocalization(
  locale: Locale,
  row: UniversitySourceRow,
  contentArRaw: Json | null | undefined,
  enDocuments: string[],
  enScholarshipNote: string | null,
): LocalizedUniversityDisplay {
  const contentAr = parseUniversityContentAr(contentArRaw);
  const useRtlContent = locale === "ar" && hasArabicUniversityContent(contentAr);

  const enTuitionDisplay = tuitionDetailLabel(row.tuition_display, row.tuition_per_year);
  const enTuitionSentence = tuitionSentenceLabel(row.tuition_display, row.tuition_per_year);
  const enLiving = livingCostLabel(row.living_display, row.estimated_living_cost_per_year);

  const enCountryName = row.country_code
    ? getLocalizedCountryName(row.country_code, "en")
    : "";
  const arCountryName = row.country_code
    ? contentAr.country_name ?? getLocalizedCountryName(row.country_code, "ar")
    : "";

  return {
    name: pickLocalizedField(locale, row.name, contentAr.name),
    city: pickLocalizedField(locale, row.city, contentAr.city) || row.city?.trim() || "",
    countryName: pickLocalizedField(locale, enCountryName, arCountryName) || enCountryName,
    description: pickLocalizedField(locale, row.description, contentAr.description) || null,
    tuitionDisplay: pickLocalizedField(
      locale,
      enTuitionDisplay,
      contentAr.tuition_display ?? contentAr.tuition_sentence,
    ),
    tuitionSentence: pickLocalizedField(
      locale,
      enTuitionSentence,
      contentAr.tuition_sentence ?? contentAr.tuition_display,
    ),
    livingFormatted: pickLocalizedField(
      locale,
      enLiving,
      contentAr.living_display ?? contentAr.living_sentence,
    ),
    satPolicy:
      pickLocalizedField(locale, row.sat_policy, contentAr.sat_policy) || null,
    methodFormatted: pickLocalizedField(locale, row.method, contentAr.method) || "—",
    intakesFormatted:
      pickLocalizedField(
        locale,
        row.intakes,
        contentAr.intakes ?? translateIntakesToArabic(row.intakes),
      ) || "—",
    documents: pickLocalizedDocuments(locale, enDocuments, contentAr.documents),
    scholarshipNote:
      pickLocalizedField(locale, enScholarshipNote, contentAr.scholarship_note) || null,
    useRtlContent,
  };
}

export function localizedTuitionCardLabel(
  locale: Locale,
  contentArRaw: Json | null | undefined,
  tuitionDisplay: string | null,
  tuitionPerYear: number | null,
): string {
  const contentAr = parseUniversityContentAr(contentArRaw);
  const en = tuitionCardLabel(tuitionDisplay, tuitionPerYear);
  return pickLocalizedField(
    locale,
    en,
    contentAr.tuition_display ?? contentAr.tuition_sentence,
  );
}
