/** GCC country codes (uppercase ISO) — order matches `search_region_rank` in DB. */
export const UNIVERSITY_SEARCH_GCC_COUNTRY_CODES = [
    "SA",
    "BH",
    "AE",
    "KW",
    "OM",
    "QA",
] as const;

export type UniversitySearchGccCountryCode =
    (typeof UNIVERSITY_SEARCH_GCC_COUNTRY_CODES)[number];

const gccRankByCode = new Map<string, number>(
    UNIVERSITY_SEARCH_GCC_COUNTRY_CODES.map((code, index) => [
        code.toUpperCase(),
        index,
    ]),
);

const NON_GCC_RANK = UNIVERSITY_SEARCH_GCC_COUNTRY_CODES.length;

/** Mirrors `universities.search_region_rank` (0–5 GCC, 6 other). */
export function universitySearchRegionRank(countryCode: string): number {
    const code = countryCode.trim().toLowerCase();
    return gccRankByCode.get(code) ?? NON_GCC_RANK;
}

export function sortCountriesForUniversitySearch<
    T extends { id: string; name: string },
>(countries: readonly T[]): T[] {
    const byId = new Map(countries.map((c) => [c.id.toLowerCase(), c]));
    const gccFirst: T[] = [];
    for (const code of UNIVERSITY_SEARCH_GCC_COUNTRY_CODES) {
        const row = byId.get(code);
        if (row) gccFirst.push(row);
    }
    const gccSet = new Set<string>(UNIVERSITY_SEARCH_GCC_COUNTRY_CODES);
    const rest = countries
        .filter((c) => !gccSet.has(c.id.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));
    return [...gccFirst, ...rest];
}
