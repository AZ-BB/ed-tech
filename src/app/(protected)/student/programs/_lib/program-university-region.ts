import { getCountryNameByAlpha2 } from "@/lib/countries";

export const PROGRAM_UNIVERSITY_REGION_ALL = "All regions" as const;

export type ProgramUniversityRegion =
  | typeof PROGRAM_UNIVERSITY_REGION_ALL
  | "UAE / GCC"
  | "United Kingdom"
  | "United States"
  | "Canada"
  | "Europe";

export type ProgramUniversityOfferingRegion = Exclude<
  ProgramUniversityRegion,
  typeof PROGRAM_UNIVERSITY_REGION_ALL
>;

export const PROGRAM_UNIVERSITY_REGION_ORDER: ProgramUniversityRegion[] = [
  PROGRAM_UNIVERSITY_REGION_ALL,
  "UAE / GCC",
  "United Kingdom",
  "United States",
  "Canada",
  "Europe",
];

const GCC_COUNTRY_CODES = new Set(["AE", "SA", "QA", "KW", "BH", "OM"]);
const US_COUNTRY_CODES = new Set(["US"]);
const CA_COUNTRY_CODES = new Set(["CA"]);
const UK_COUNTRY_CODES = new Set(["GB", "UK"]);
const EUROPE_COUNTRY_CODES = new Set([
  "AL", "AD", "AT", "BY", "BE", "BA", "BG", "HR", "CY", "CZ", "DK", "EE",
  "FI", "FR", "DE", "GR", "HU", "IS", "IE", "IT", "XK", "LV", "LI", "LT",
  "LU", "MT", "MD", "MC", "ME", "NL", "MK", "NO", "PL", "PT", "RO", "RU",
  "SM", "RS", "SK", "SI", "ES", "SE", "CH", "TR", "UA", "VA",
]);

export function getUniversityProgramRegion(
  countryCode: string,
): ProgramUniversityOfferingRegion | null {
  const code = countryCode.trim().toUpperCase();
  if (GCC_COUNTRY_CODES.has(code)) return "UAE / GCC";
  if (US_COUNTRY_CODES.has(code)) return "United States";
  if (CA_COUNTRY_CODES.has(code)) return "Canada";
  if (UK_COUNTRY_CODES.has(code)) return "United Kingdom";
  if (EUROPE_COUNTRY_CODES.has(code)) return "Europe";
  return null;
}

export function countryCodeDisplayLabel(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  if (code === "AE") return "UAE";
  if (code === "GB") return "UK";
  return code;
}

export function getCountryDisplayName(countryCode: string): string {
  return getCountryNameByAlpha2(countryCode) ?? countryCode;
}

export function regionsForOfferings(
  regions: Array<ProgramUniversityOfferingRegion | null>,
): ProgramUniversityRegion[] {
  const present = new Set(
    regions.filter((region): region is ProgramUniversityOfferingRegion => region != null),
  );
  return PROGRAM_UNIVERSITY_REGION_ORDER.filter(
    (region) =>
      region === PROGRAM_UNIVERSITY_REGION_ALL || present.has(region),
  );
}
