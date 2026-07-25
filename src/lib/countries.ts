import { getName, getNames, isValid, registerLocale } from "i18n-iso-countries";
import arLocale from "i18n-iso-countries/langs/ar.json";
import enLocale from "i18n-iso-countries/langs/en.json";
import type { Locale } from "@/lib/i18n/config";

registerLocale(enLocale);
registerLocale(arLocale);

export type Country = {
  /** ISO 3166-1 alpha-2 (uppercase, e.g. `AE`, `US`) */
  readonly alpha2: string;
  /** English official country name */
  readonly name: string;
};

const EN_LOCALE = "en" as const;

const names = getNames(EN_LOCALE, { select: "official" });

/**
 * All countries with ISO alpha-2 codes, sorted by English name.
 * Data source: `i18n-iso-countries` (registered English locale).
 */
export const COUNTRIES: readonly Country[] = Object.entries(names)
  .map(([alpha2, name]) => ({
    alpha2,
    name,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, "en"));

export function isValidAlpha2Code(code: string): boolean {
  return isValid(code);
}

export function getCountryNameByAlpha2(
  alpha2: string,
  lang: string = EN_LOCALE,
): string | undefined {
  return getName(alpha2, lang, { select: "official" });
}

/** Manual locale-aware country name (English or Arabic via i18n-iso-countries). */
export function getLocalizedCountryName(alpha2: string, locale: Locale): string {
  const code = alpha2.trim().toUpperCase();
  const lang = locale === "ar" ? "ar" : EN_LOCALE;
  return getName(code, lang, { select: "official" }) ?? code;
}
