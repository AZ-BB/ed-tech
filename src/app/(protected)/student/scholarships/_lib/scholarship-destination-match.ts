import { COUNTRIES, isValidAlpha2Code } from "@/lib/countries";

/** Common destination labels in discovery data that differ from i18n official names. */
const DESTINATION_NAME_TO_ALPHA2: Readonly<Record<string, string>> = {
  "united states": "US",
  "united states of america": "US",
  russia: "RU",
  "russian federation": "RU",
  turkey: "TR",
  türkiye: "TR",
  turkiye: "TR",
  brunei: "BN",
  "brunei darussalam": "BN",
  uk: "GB",
  "united kingdom": "GB",
  "great britain": "GB",
};

const countryNameToAlpha2 = new Map(
  COUNTRIES.map((c) => [c.name.toLowerCase(), c.alpha2] as const),
);

export function resolveScholarshipDestinationAlpha2(token: string): string | null {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (lower === "global" || lower === "multiple") return null;

  if (trimmed.length === 2 && isValidAlpha2Code(trimmed.toUpperCase())) {
    return trimmed.toUpperCase();
  }

  const fromCountryList = countryNameToAlpha2.get(lower);
  if (fromCountryList) return fromCountryList;

  return DESTINATION_NAME_TO_ALPHA2[lower] ?? null;
}

export function scholarshipDestinationMatchesFilter(
  destinations: readonly string[],
  filterValue: string,
): boolean {
  const dest = filterValue.trim();
  if (!dest || dest.toLowerCase() === "any") return true;

  const filterAlpha2 = resolveScholarshipDestinationAlpha2(dest);
  const filterLower = dest.toLowerCase();

  for (const raw of destinations) {
    const token = raw.trim();
    if (!token) continue;

    const tokenLower = token.toLowerCase();
    if (tokenLower === "global" || tokenLower === "multiple") return true;
    if (tokenLower === filterLower) return true;

    const tokenAlpha2 = resolveScholarshipDestinationAlpha2(token);
    if (filterAlpha2 && tokenAlpha2 && filterAlpha2 === tokenAlpha2) return true;
  }

  return false;
}
