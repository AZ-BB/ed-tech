export type EventLocationOption = {
  /** Value stored in URL params and matched against `university_events.country`. */
  value: string;
  alpha2: string;
  aliases?: readonly string[];
};

export const EVENT_LOCATION_GCC: readonly EventLocationOption[] = [
  { value: "UAE", alpha2: "AE", aliases: ["United Arab Emirates"] },
  { value: "Saudi Arabia", alpha2: "SA" },
  { value: "Qatar", alpha2: "QA" },
  { value: "Kuwait", alpha2: "KW" },
  { value: "Bahrain", alpha2: "BH" },
  { value: "Oman", alpha2: "OM" },
];

export const EVENT_LOCATION_LEVANT: readonly EventLocationOption[] = [
  { value: "Jordan", alpha2: "JO" },
  { value: "Lebanon", alpha2: "LB" },
];

export const EVENT_LOCATION_NORTH_AFRICA: readonly EventLocationOption[] = [
  { value: "Egypt", alpha2: "EG" },
];

export const EVENT_LOCATION_GROUPS = [
  { key: "gcc", options: EVENT_LOCATION_GCC },
  { key: "levant", options: EVENT_LOCATION_LEVANT },
  { key: "northAfrica", options: EVENT_LOCATION_NORTH_AFRICA },
] as const;

const ALL_EVENT_LOCATION_OPTIONS: readonly EventLocationOption[] = [
  ...EVENT_LOCATION_GCC,
  ...EVENT_LOCATION_LEVANT,
  ...EVENT_LOCATION_NORTH_AFRICA,
];

const KNOWN_EVENT_COUNTRY_VALUES = new Set(
  ALL_EVENT_LOCATION_OPTIONS.flatMap((option) => [
    option.value,
    ...(option.aliases ?? []),
  ]),
);

/** Normalize free-text event country values to canonical filter values. */
export function normalizeEventCountry(
  country: string | null | undefined,
): string {
  const trimmed = (country ?? "").trim();
  if (!trimmed) return "";

  for (const option of ALL_EVENT_LOCATION_OPTIONS) {
    if (option.value === trimmed) return option.value;
    if (option.aliases?.includes(trimmed)) return option.value;
  }

  return trimmed;
}

export function eventCountryMatchesLocationFilter(
  eventCountry: string | null | undefined,
  filterLocation: string,
): boolean {
  return (
    normalizeEventCountry(eventCountry) === normalizeEventCountry(filterLocation)
  );
}

/** Country values from events data that are not in the curated regional groups. */
export function getOtherEventLocations(locations: readonly string[]): string[] {
  return locations.filter(
    (location) =>
      location !== "Online" && !KNOWN_EVENT_COUNTRY_VALUES.has(location),
  );
}
