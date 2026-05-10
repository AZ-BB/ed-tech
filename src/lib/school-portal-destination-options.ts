/** Curated destination dropdown: same groups / order as Teacher Portal `f-dest`. */

export type DestinationSelectItem =
  | { kind: "option"; value: string; label: string }
  | { kind: "divider"; label: string };

const COMMON: readonly string[] = [
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "New Zealand",
  "Ireland",
];

const EUROPE: readonly string[] = [
  "Germany",
  "Netherlands",
  "France",
  "Italy",
  "Spain",
  "Switzerland",
  "Sweden",
  "Denmark",
  "Norway",
  "Finland",
  "Belgium",
  "Austria",
  "Portugal",
];

const GCC_MENA: readonly string[] = [
  "UAE",
  "Saudi Arabia",
  "Bahrain",
  "Qatar",
  "Kuwait",
  "Oman",
  "Lebanon",
  "Jordan",
  "Egypt",
  "Morocco",
  "Tunisia",
  "Turkey",
];

const ASIA: readonly string[] = [
  "Singapore",
  "Hong Kong",
  "Japan",
  "South Korea",
  "Malaysia",
  "China",
  "India",
];

const OTHER_GROUP: readonly string[] = ["South Africa"];

/** All curated labels, for filtering DB country names out of “Other countries”. */
export const ALL_CURATED_DESTINATION_LABELS: ReadonlySet<string> = new Set([
  ...COMMON,
  ...EUROPE,
  ...GCC_MENA,
  ...ASIA,
  ...OTHER_GROUP,
]);

function optionsFromNames(names: readonly string[]): DestinationSelectItem[] {
  return names.map((label) => ({
    kind: "option" as const,
    value: label,
    label,
  }));
}

/**
 * Static curated section (optgroups via dividers).
 */
export function getCuratedDestinationSelectItems(): DestinationSelectItem[] {
  return [
    { kind: "divider", label: "—— Common destinations ——" },
    ...optionsFromNames(COMMON),
    { kind: "divider", label: "—— Europe ——" },
    ...optionsFromNames(EUROPE),
    { kind: "divider", label: "—— GCC / MENA ——" },
    ...optionsFromNames(GCC_MENA),
    { kind: "divider", label: "—— Asia ——" },
    ...optionsFromNames(ASIA),
    { kind: "divider", label: "—— Other ——" },
    ...optionsFromNames(OTHER_GROUP),
  ];
}

/**
 * Names from `countries` not present in the curated list, sorted A–Z.
 */
export function getOtherCountryNames(
  countryRows: readonly { name: string }[],
): DestinationSelectItem[] {
  const names = countryRows
    .map((r) => r.name?.trim())
    .filter((n): n is string =>
      Boolean(n && !ALL_CURATED_DESTINATION_LABELS.has(n)),
    );

  const unique = [...new Set(names)].sort((a, b) => a.localeCompare(b, "en"));
  return unique.map((label) => ({
    kind: "option" as const,
    value: label,
    label,
  }));
}

export function buildFullDestinationSelectItems(
  countryRows: readonly { name: string }[],
): DestinationSelectItem[] {
  return [
    ...getCuratedDestinationSelectItems(),
    { kind: "divider", label: "—— Other countries ——" },
    ...getOtherCountryNames(countryRows),
  ];
}

/** Grade filter options (match stored `student_profiles.grade` values). */
export const GRADE_FILTER_OPTIONS = ["Grade 11", "Grade 12"] as const;
