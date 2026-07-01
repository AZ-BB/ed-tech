"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import { sortCountriesForUniversitySearch } from "@/lib/university-search-gcc";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

const FILTER_SELECT_CHEVRON =
    'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

const filterSelectBase =
    "min-h-9 shrink-0 cursor-pointer rounded-[50px] border-[1.5px] border-[#e0deda] bg-white px-3.5 py-2 text-[11.5px] leading-none text-[#4a4a4a] transition-all hover:border-[#a0a0a0] focus:border-[#40916C] focus:outline-none appearance-none bg-[length:10px_6px] bg-[position:right_12px_center] bg-no-repeat pr-[30px]";

/** Default width for Major, Program, Type, Difficulty */
const filterSelectClass = `${filterSelectBase} min-w-[120px] max-w-[200px]`;

/** Narrower — country names are long in the list but the closed control does not need to span the row */
const filterSelectCountryClass = `${filterSelectBase} w-[132px] min-w-[132px] max-w-[132px]`;

const filterToggleClass =
    "inline-flex min-h-9 shrink-0 cursor-pointer items-center justify-center rounded-[50px] border-[1.5px] px-3.5 py-2 text-[11.5px] font-medium leading-none transition-all";

const filterToggleOffClass = `${filterToggleClass} border-[#e0deda] bg-white text-[#4a4a4a] hover:border-[#2D6A4F] hover:bg-[#f0f7f2] hover:text-[#2D6A4F]`;

const filterToggleOnClass = `${filterToggleClass} border-[#2D6A4F] bg-[#f0faf3] text-[#2D6A4F]`;

const filterToggleOffShortlistClass = `${filterToggleClass} border-[#2D6A4F]/40 bg-[#e8f5e9]/50 text-[#2D6A4F]/60 hover:bg-[#e8f5e9]/70 hover:text-[#2D6A4F]`;
const filterToggleOnShortlistClass = `${filterToggleClass} border-[#2D6A4F] bg-[#e8f5e9] text-[#2D6A4F]`;

const filterToggleOffFavouritesClass = `${filterToggleClass} border-[#b8860b]/40 bg-[#fef9e7]/50 text-[#b8860b]/60 hover:bg-[#fef9e7]/70 hover:text-[#b8860b]`;
const filterToggleOnFavouritesClass = `${filterToggleClass} border-[#b8860b] bg-[#fef9e7] text-[#b8860b]`;

export type UniversitiesFilterProps = {
    majors: { id: number; name: string }[];
    countries: { id: string; name: string }[];
    programs: { id: number; name: string }[];
    search?: string;
    majorId?: string;
    programId?: string;
    countryCode?: string;
    uniType?: string;
    difficulty?: string;
    shortlistOnly?: boolean;
    favouritesOnly?: boolean;
};

export const FILTER_PARAM_KEYS = [
    "search",
    "major_id",
    "program_id",
    "country_code",
    "uni_type",
    "difficulty",
    "shortlisted",
    "favourites",
] as const;

export type FilterParamKey = (typeof FILTER_PARAM_KEYS)[number];

function applyFilterPatch(
    base: URLSearchParams,
    patch: Partial<Record<FilterParamKey, string | null>>,
) {
    const next = new URLSearchParams(base.toString());
    for (const [key, raw] of Object.entries(patch)) {
        if (!(FILTER_PARAM_KEYS as readonly string[]).includes(key)) continue;
        if (raw === null || raw === undefined || raw === "") next.delete(key);
        else next.set(key, raw);
    }
    next.delete("page");
    return next;
}

function stripFilterParams(base: URLSearchParams) {
    const next = new URLSearchParams(base.toString());
    for (const k of FILTER_PARAM_KEYS) next.delete(k);
    next.delete("page");
    return next;
}

export function UniversitiesFilter({
    majors,
    countries,
    programs,
    search: searchInitial = "",
    majorId,
    programId,
    countryCode,
    uniType,
    difficulty,
    shortlistOnly = false,
    favouritesOnly = false,
}: UniversitiesFilterProps) {
    const { dict } = useLocale();
    const t = dict.student.universities;
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const paramsRef = useRef(new URLSearchParams(searchParams.toString()));
    const searchParamsSnapshot = searchParams.toString();
    useEffect(() => {
        paramsRef.current = new URLSearchParams(searchParamsSnapshot);
    }, [searchParamsSnapshot]);

    const [searchDraft, setSearchDraft] = useState(searchInitial);

    useEffect(() => {
        setSearchDraft(searchInitial);
    }, [searchInitial]);

    const navigateWithParams = useCallback(
        (next: URLSearchParams) => {
            const q = next.toString();
            paramsRef.current = new URLSearchParams(q);
            startTransition(() => {
                router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
            });
        },
        [pathname, router],
    );

    const patchAndNavigate = useCallback(
        (patch: Partial<Record<FilterParamKey, string | null>>) => {
            const next = applyFilterPatch(paramsRef.current, patch);
            navigateWithParams(next);
        },
        [navigateWithParams],
    );

    useEffect(() => {
        const t = window.setTimeout(() => {
            const trimmed = searchDraft.trim();
            const desired = trimmed || "";
            const current = paramsRef.current.get("search") ?? "";
            if (desired === current) return;
            patchAndNavigate({ search: desired || null });
        }, 380);
        return () => window.clearTimeout(t);
    }, [patchAndNavigate, searchDraft]);

    const majorValue = majorId ?? "";
    const countryValue = countryCode ?? "";
    const typeValue =
        uniType === "public" || uniType === "private" ? uniType : "";
    const difficultyValue =
        difficulty === "easy" ||
            difficulty === "medium" ||
            difficulty === "hard"
            ? difficulty
            : "";

    const programValue = programId ?? "";
    const showProgramSelect = Boolean(majorValue);

    const sortMajors = useMemo(() => [...majors].sort((a, b) => a.name.localeCompare(b.name)), [majors]);
    const sortCountries = useMemo(
        () => sortCountriesForUniversitySearch(countries),
        [countries],
    );
    const sortPrograms = useMemo(
        () => [...programs].sort((a, b) => a.name.localeCompare(b.name)),
        [programs],
    );

    return (
        <div
            className={`relative z-10 mb-5 flex flex-col gap-0 ${isPending ? "opacity-75" : ""}`}
            aria-busy={isPending}
        >
            <div className="mb-3.5 flex items-center gap-3 rounded-[16px] border-[1.5px] border-[#ece9e4] bg-white px-4 py-3.5 transition-[border-color,box-shadow] focus-within:border-[#40916C] focus-within:shadow-[0_0_0_4px_rgba(45,106,79,0.06)] sm:px-5 sm:py-4">
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#a0a0a0"
                    strokeWidth="2"
                    aria-hidden
                >
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                </svg>
                <label htmlFor="university-search" className="sr-only">
                    {t.searchLabel}
                </label>
                <input
                    id="university-search"
                    type="search"
                    placeholder={t.searchPlaceholder}
                    className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[#1a1a1a] outline-none placeholder:text-[#c0bdb8]"
                    autoComplete="off"
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                />
            </div>

            <div className="rounded-[16px] border border-[#ece9e4] bg-white px-4 py-3 sm:px-5">
                <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex min-h-9 min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
                <select
                    aria-label={t.major}
                    className={filterSelectClass}
                    style={{ backgroundImage: FILTER_SELECT_CHEVRON }}
                    value={majorValue}
                    onChange={(e) => {
                        const v = e.target.value || null;
                        patchAndNavigate({
                            major_id: v,
                            program_id: null,
                        });
                    }}
                >
                    <option value="" disabled hidden>
                        {t.major}
                    </option>
                    {sortMajors.map((m) => (
                        <option key={m.id} value={String(m.id)} className="bidi-ltr" dir="ltr">
                            {m.name}
                        </option>
                    ))}
                </select>

                {showProgramSelect ? (
                    <select
                        aria-label={t.program}
                        className={filterSelectClass}
                        style={{ backgroundImage: FILTER_SELECT_CHEVRON }}
                        value={programValue}
                        onChange={(e) =>
                            patchAndNavigate({
                                program_id: e.target.value ? e.target.value : null,
                            })
                        }
                    >
                        <option value="" disabled hidden>
                            {t.program}
                        </option>
                        {sortPrograms.map((p) => (
                            <option key={p.id} value={String(p.id)} className="bidi-ltr" dir="ltr">
                                {p.name}
                            </option>
                        ))}
                    </select>
                ) : null}

                <select
                    aria-label={t.country}
                    className={filterSelectCountryClass}
                    style={{ backgroundImage: FILTER_SELECT_CHEVRON }}
                    value={countryValue}
                    onChange={(e) =>
                        patchAndNavigate({
                            country_code: e.target.value ? e.target.value : null,
                        })
                    }
                >
                    <option value="" disabled hidden>
                        {t.country}
                    </option>
                    {sortCountries.map((c) => (
                        <option key={c.id} value={c.id} className="bidi-ltr" dir="ltr">
                            {c.name}
                        </option>
                    ))}
                </select>

                <select
                    aria-label={t.institutionType}
                    className={filterSelectClass}
                    style={{ backgroundImage: FILTER_SELECT_CHEVRON }}
                    value={typeValue}
                    onChange={(e) =>
                        patchAndNavigate({
                            uni_type: e.target.value ? e.target.value : null,
                        })
                    }
                >
                    <option value="" disabled hidden>
                        {t.type}
                    </option>
                    <option value="public">{t.public}</option>
                    <option value="private">{t.private}</option>
                </select>

                <select
                    aria-label={t.admissionDifficulty}
                    className={filterSelectClass}
                    style={{ backgroundImage: FILTER_SELECT_CHEVRON }}
                    value={difficultyValue}
                    onChange={(e) =>
                        patchAndNavigate({
                            difficulty: e.target.value ? e.target.value : null,
                        })
                    }
                >
                    <option value="" disabled hidden>
                        {t.admissionDifficulty}
                    </option>
                    <option value="easy">{t.easy}</option>
                    <option value="medium">{t.medium}</option>
                    <option value="hard">{t.hard}</option>
                </select>
                    </div>

                    <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2 sm:flex-nowrap">
                    <button
                        type="button"
                        aria-pressed={shortlistOnly}
                        aria-label={shortlistOnly ? t.showAllUniversities : t.showShortlistedOnly}
                        className={shortlistOnly ? filterToggleOnShortlistClass : filterToggleOffShortlistClass}
                        onClick={() =>
                            patchAndNavigate({
                                shortlisted: shortlistOnly ? null : "1",
                            })
                        }
                    >
                        {t.shortlisted}
                    </button>
                    <button
                        type="button"
                        aria-pressed={favouritesOnly}
                        aria-label={favouritesOnly ? t.showAllUniversities : t.showFavouritesOnly}
                        className={favouritesOnly ? filterToggleOnFavouritesClass : filterToggleOffFavouritesClass}
                        onClick={() =>
                            patchAndNavigate({
                                favourites: favouritesOnly ? null : "1",
                            })
                        }
                    >
                        {t.favourites}
                    </button>
                <button
                    type="button"
                    className="inline-flex h-9 shrink-0 cursor-pointer items-center rounded-[50px] border-[1.5px] border-[#e0deda] bg-white px-[18px] text-[11.5px] font-medium leading-none text-[#7a7a7a] transition-all hover:border-[#2D6A4F] hover:bg-[#f0f7f2] hover:text-[#2D6A4F]"
                    onClick={() => {
                        setSearchDraft("");
                        const next = stripFilterParams(paramsRef.current);
                        navigateWithParams(next);
                    }}
                >
                    {t.clearFilters}
                </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
