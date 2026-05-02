import { getName, getNames, isValid, registerLocale } from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

registerLocale(enLocale);

const LOCALE = "en" as const;

export type Country = {
  /** ISO 3166-1 alpha-2 (uppercase, e.g. `AE`, `US`) */
  readonly alpha2: string;
  /** English official country name */
  readonly name: string;
};

const names = getNames(LOCALE, { select: "official" });

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
  lang: string = LOCALE,
): string | undefined {
  return getName(alpha2, lang, { select: "official" });
}
