import { getCountryNameByAlpha2, isValidAlpha2Code } from "@/lib/countries";

import type { Scholarship } from "../_components/types";

/** Maps synthetic nationality filter values to a sponsoring-state alpha-2. */
const SYNTHETIC_NATIONALITY_TO_ALPHA2: Readonly<Record<string, string>> = {
  "us-cit": "US",
  "gb-cit": "GB",
  "ca-cit": "CA",
};

/**
 * ISO alpha-2 for the government whose programs should appear in the Government
 * bucket when the student picks a nationality. Returns null when the filter does
 * not map to a single country (any / regional / other).
 */
export function governmentCountryAlpha2FromNationalityFilter(
  nationalityLower: string,
): string | null {
  const n = nationalityLower.trim().toLowerCase();
  if (!n || n === "any" || n === "other" || n === "eu-cit") return null;
  const fromSynthetic = SYNTHETIC_NATIONALITY_TO_ALPHA2[n];
  if (fromSynthetic) return fromSynthetic;
  if (n.length === 2 && isValidAlpha2Code(n.toUpperCase())) {
    return n.toUpperCase();
  }
  return null;
}

/** True when the scholarship’s sponsoring `country` matches the selected nationality’s state. */
export function governmentScholarshipMatchesNationalityCountry(
  s: Scholarship,
  alpha2: string | null,
): boolean {
  if (!alpha2) return true;
  const official = getCountryNameByAlpha2(alpha2);
  if (!official) return true;
  const want = official.trim().toLowerCase();
  const got = String(s.country ?? "").trim().toLowerCase();
  if (!got) return false;
  if (got === want) return true;
  if (alpha2 === "US") {
    return got === "united states" || got === "united states of america";
  }
  return false;
}
