/** United States appears first in university discovery sort and country pickers. */
export const UNIVERSITY_SEARCH_US_FIRST_COUNTRY_CODE = "US";

/** GCC country codes (uppercase ISO) — order matches `search_region_rank` in DB after US. */
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

const US_RANK = 0;

const gccRankByCode = new Map<string, number>(
    UNIVERSITY_SEARCH_GCC_COUNTRY_CODES.map((code, index) => [
        code.toUpperCase(),
        index + 1,
    ]),
);

const NON_GCC_RANK = UNIVERSITY_SEARCH_GCC_COUNTRY_CODES.length + 1;

/** Mirrors `universities.search_region_rank` (0 US, 1–6 GCC, 7 other). */
export function universitySearchRegionRank(countryCode: string): number {
    const code = countryCode.trim().toUpperCase();
    if (code === UNIVERSITY_SEARCH_US_FIRST_COUNTRY_CODE) return US_RANK;
    return gccRankByCode.get(code) ?? NON_GCC_RANK;
}

export function sortCountriesForUniversitySearch<
    T extends { id: string; name: string },
>(countries: readonly T[]): T[] {
    const byId = new Map(countries.map((c) => [c.id.toLowerCase(), c]));
    const usCountry = byId.get(
        UNIVERSITY_SEARCH_US_FIRST_COUNTRY_CODE.toLowerCase(),
    );
    const gccFirst: T[] = [];
    for (const code of UNIVERSITY_SEARCH_GCC_COUNTRY_CODES) {
        const row = byId.get(code.toLowerCase());
        if (row) gccFirst.push(row);
    }
    const pinnedCodes = new Set<string>([
        UNIVERSITY_SEARCH_US_FIRST_COUNTRY_CODE,
        ...UNIVERSITY_SEARCH_GCC_COUNTRY_CODES,
    ]);
    const rest = countries
        .filter((c) => !pinnedCodes.has(c.id.toUpperCase()))
        .sort((a, b) => a.name.localeCompare(b.name));
    return [
        ...(usCountry ? [usCountry] : []),
        ...gccFirst,
        ...rest,
    ];
}
