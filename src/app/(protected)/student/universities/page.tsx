import { Pagination } from "@/components/pagination";
import type { Database } from "@/database.types";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import Link from "next/link";
import { Suspense } from "react";
import { UniversitiesFilter } from "./_components/universities-filter";
import { UniversityCard, type UniversityCardUniversity } from "./_components/university-card";

type SecretSupabaseClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

const UNIVERSITIES_PAGE_LIMIT_OPTIONS = [12, 24, 48] as const;
const UNIVERSITIES_PAGE_DEFAULT_LIMIT = UNIVERSITIES_PAGE_LIMIT_OPTIONS[0];

function paginationTotals(totalRows: number, page: number, limit: number) {
    const totalPages = Math.max(1, Math.ceil(totalRows / limit));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const offset = (safePage - 1) * limit;
    return { totalPages, safePage, offset };
}

function parseUniversitiesPagination(sp: { page?: string; limit?: string }) {
    const limitRaw = Number.parseInt(sp.limit ?? "", 10);
    const limit = UNIVERSITIES_PAGE_LIMIT_OPTIONS.includes(
        limitRaw as (typeof UNIVERSITIES_PAGE_LIMIT_OPTIONS)[number],
    )
        ? limitRaw
        : UNIVERSITIES_PAGE_DEFAULT_LIMIT;

    const pageRaw = Number.parseInt(sp.page ?? "1", 10);
    const page =
        Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

    return { page, limit };
}

type UniversitiesFilterContext = {
    majorId?: string;
    programId?: string;
    countryCode?: string;
    uniType?: string | undefined;
    searchTrimmed?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyUniversitiesFilters(q: any, ctx: UniversitiesFilterContext) {
    let x = q;
    if (ctx.majorId) {
        x = x.eq("university_majors.major_id", parseInt(ctx.majorId, 10));
    }
    if (ctx.programId) {
        x = x.eq(
            "university_majors.university_major_programs.program_id",
            parseInt(ctx.programId, 10),
        );
    }
    if (ctx.countryCode) {
        x = x.eq("country_code", ctx.countryCode);
    }
    if (ctx.uniType === "public") {
        x = x.eq("is_public", true);
    } else if (ctx.uniType === "private") {
        x = x.eq("is_public", false);
    }
    if (ctx.searchTrimmed) {
        x = x.ilike("name", `%${ctx.searchTrimmed}%`);
    }
    return x;
}

function normalizeDifficulty(v: string | undefined): string | undefined {
    if (!v) return undefined;
    const x = v.toLowerCase();
    return x === "easy" || x === "medium" || x === "hard" ? x : undefined;
}

function normalizeUniType(v: string | undefined): string | undefined {
    if (!v) return undefined;
    const x = v.toLowerCase();
    return x === "public" || x === "private" ? x : undefined;
}

function truthyQueryFlag(v: string | undefined): boolean {
    const t = v?.trim().toLowerCase();
    return t === "1" || t === "true" || t === "yes";
}

type StudentActivityRow = {
    id: number;
    type: Database["public"]["Enums"]["student_activity_type"] | null;
};

/** Row shape for list query; explicit because dynamic `.select()` breaks Supabase `ParserError` inference. */
type UniversitiesListQueryRow = Omit<UniversityCardUniversity, "country_name" | "is_shortlisted" | "is_favourite"> & {
    countries: { name: string } | null;
    student_activities: StudentActivityRow[] | null;
};

function isUniversityShortlistedFromActivities(activities: StudentActivityRow[] | null | undefined): boolean {
    return activities?.some((a) => a.type === "shortlist") ?? false;
}

function isUniversityFavouriteFromActivities(activities: StudentActivityRow[] | null | undefined): boolean {
    return activities?.some((a) => a.type === "save") ?? false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyStudentActivityFilters(
    q: any,
    opts: { shortlistOnly: boolean; favouritesOnly: boolean },
) {
    if (!opts.shortlistOnly && !opts.favouritesOnly) return q;
    let x = q.eq("student_activities.entity_type", "university");
    if (opts.shortlistOnly && opts.favouritesOnly) {
        x = x.or("type.eq.shortlist,type.eq.save", { foreignTable: "student_activities" });
    } else if (opts.shortlistOnly) {
        x = x.eq("student_activities.type", "shortlist");
    } else {
        x = x.eq("student_activities.type", "save");
    }
    return x;
}

type UniversitiesPageSearchParams = {
    major_id?: string;
    program_id?: string;
    country_code?: string;
    search?: string;
    uni_type?: string;
    difficulty?: string;
    shortlisted?: string;
    favourites?: string;
    page?: string;
    limit?: string;
};

async function resolveUniversitiesFilterState(
    sp: UniversitiesPageSearchParams,
    supabase: SecretSupabaseClient,
    majors: { id: number; name: string }[] | null | undefined,
    countries: { id: string; name: string }[] | null | undefined,
) {
    const majorIdRaw = sp.major_id?.trim();
    const programIdRaw = sp.program_id?.trim();
    const countryCodeRaw = sp.country_code?.trim().toUpperCase();
    const search = sp.search;
    const uniType = normalizeUniType(sp.uni_type);
    const difficulty = normalizeDifficulty(sp.difficulty);

    const majorsList = majors ?? [];
    const countriesList = countries ?? [];
    const majorId =
        majorIdRaw && majorsList.some((m) => String(m.id) === majorIdRaw)
            ? majorIdRaw
            : undefined;
    const countryCode =
        countryCodeRaw?.length === 2 &&
            countriesList.some((c) => c.id === countryCodeRaw)
            ? countryCodeRaw
            : undefined;

    let programs: { id: number; name: string }[] = [];
    if (majorId) {
        const { data: programsData, error: programsError } = await supabase
            .from("programs")
            .select("id, name")
            .eq("major_id", parseInt(majorId, 10));
        if (programsError) {
            console.error(programsError);
        }
        programs = programsData ?? [];
    }

    const programId =
        majorId &&
            programIdRaw &&
            programs.some((p) => String(p.id) === programIdRaw)
            ? programIdRaw
            : undefined;

    return {
        search,
        uniType,
        difficulty,
        majorsList,
        countriesList,
        majorId,
        countryCode,
        programId,
        programs,
    };
}

export default async function StudentUniversitiesPage({
    searchParams,
}: {
    searchParams: Promise<UniversitiesPageSearchParams>;
}) {
    const sp = await searchParams;

    const supabase = await createSupabaseServerClient();

    const { data: majors, error: majorsError } = await supabase
        .from("majors")
        .select("id, name");
    if (majorsError) {
        console.error(majorsError);
    }

    const { data: countries, error: countriesError } = await supabase
        .from("countries")
        .select("id, name");
    if (countriesError) {
        console.error(countriesError);
    }

    const {
        search,
        uniType,
        difficulty,
        majorsList,
        countriesList,
        majorId,
        countryCode,
        programId,
        programs,
    } = await resolveUniversitiesFilterState(sp, supabase, majors, countries);

    const { page: pageParam, limit: limitParam } = parseUniversitiesPagination(sp);
    const searchTrimmed = search?.trim() || undefined;

    const filterShortlisted = truthyQueryFlag(sp.shortlisted);
    const filterFavourites = truthyQueryFlag(sp.favourites);
    const studentActivitiesInner = filterShortlisted || filterFavourites;

    const filterCtx: UniversitiesFilterContext = {
        majorId,
        programId,
        countryCode,
        uniType,
        searchTrimmed,
    };

    const universityMajorsEmbed =
        !majorId
            ? "university_majors ( major_id )"
            : programId
                ? "university_majors!inner ( major_id, university_major_programs!inner ( program_id ) )"
                : "university_majors!inner ( major_id )";

    const studentActivitiesFragment = `student_activities${studentActivitiesInner ? "!inner" : ""} ( id, type )`;

    const universitiesListSelect = `
            id,
            name,
            city,
            state,
            country_code,
            is_public,
            description,
            logo_url,
            tuition_per_year,
            deadline_date,
            is_priority,
            ielts_min_score,
            sat_policy,
            acceptance_rate,
            countries ( name ),
            ${studentActivitiesFragment},
            ${universityMajorsEmbed}
            `;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function buildUniversitiesListQuery(): any {
        let q = supabase.from("universities").select(universitiesListSelect, { count: "exact" });
        q = applyUniversitiesFilters(q, filterCtx);
        q = applyStudentActivityFilters(q, {
            shortlistOnly: filterShortlisted,
            favouritesOnly: filterFavourites,
        });
        return q.order("created_at", { ascending: false });
    }

    const requestedOffset = (pageParam - 1) * limitParam;
    let listQuery = buildUniversitiesListQuery().range(
        requestedOffset,
        requestedOffset + limitParam - 1,
    );

    let { data: universitiesRaw, count: universitiesCount, error: universitiesError } =
        await listQuery;

    if (universitiesError) {
        console.error(universitiesError);
    }

    const totalRows = universitiesCount ?? 0;
    const { safePage, offset: safeOffset } = paginationTotals(
        totalRows,
        pageParam,
        limitParam,
    );

    if (!universitiesError && safePage !== pageParam && totalRows > 0) {
        listQuery = buildUniversitiesListQuery().range(
            safeOffset,
            safeOffset + limitParam - 1,
        );
        const second = await listQuery;
        universitiesRaw = second.data;
        if (second.error) {
            console.error(second.error);
        }
    }

    const rows = universitiesRaw as UniversitiesListQueryRow[] | null | undefined;
    const universities =
        rows?.map((row) => {
            const country = row.countries;
            return {
                id: row.id,
                name: row.name,
                city: row.city,
                state: row.state,
                country_code: row.country_code,
                country_name: country?.name ?? row.country_code,
                is_public: row.is_public,
                description: row.description,
                logo_url: row.logo_url,
                tuition_per_year: row.tuition_per_year,
                deadline_date: row.deadline_date,
                is_priority: row.is_priority,
                ielts_min_score: row.ielts_min_score,
                sat_policy: row.sat_policy,
                acceptance_rate: row.acceptance_rate,
                is_shortlisted: isUniversityShortlistedFromActivities(row.student_activities),
                is_favourite: isUniversityFavouriteFromActivities(row.student_activities),
            } satisfies UniversityCardUniversity;
        }) ?? [];

    return (
        <>
            <div className="mb-5">
                <h1 className="serif mb-1 text-[26px] font-normal leading-tight text-[#1a1a1a]">
                    Explore universities
                </h1>
                <p className="text-sm leading-normal text-[#7a7a7a]">
                    Search and compare universities based on your interests,
                    goals, and admission profile.
                </p>
            </div>

            <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#ece9e4] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:py-5">
                <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#1a1a1a]">
                        AI university matching
                    </div>
                    <p className="mt-1 max-w-xl text-xs leading-snug text-[#7a7a7a]">
                        Get ranked suggestions from your profile — same journey as
                        search, focused on fit.
                    </p>
                </div>
                <Link
                    href="/student/ai-matching"
                    className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full bg-[#2D6A4F] px-5 py-2.5 text-[13px] font-semibold text-white no-underline transition-all hover:bg-[#1B4332] hover:-translate-y-px sm:self-center"
                >
                    Open AI matching
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        aria-hidden
                    >
                        <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                </Link>
            </div>

            <Suspense fallback={
                <div
                    className="mb-5 h-[188px] rounded-[16px] border border-[#ece9e4] bg-white/70"
                    aria-hidden
                />
            }>
                <UniversitiesFilter
                    majors={majorsList}
                    countries={countriesList}
                    programs={programs}
                    search={search ?? ""}
                    majorId={majorId}
                    programId={programId}
                    countryCode={countryCode}
                    uniType={uniType}
                    difficulty={difficulty}
                    shortlistOnly={filterShortlisted}
                    favouritesOnly={filterFavourites}
                />
            </Suspense>

            <div className="grid grid-cols-1 gap-4 min-[600px]:grid-cols-2 min-[900px]:grid-cols-3 items-stretch">
                {universities.map((university) => (
                    <UniversityCard key={university.id} university={university} />
                ))}
            </div>

            <Pagination
                totalRows={totalRows}
                page={safePage}
                limit={limitParam}
                limitOptions={UNIVERSITIES_PAGE_LIMIT_OPTIONS}
                summary="total"
                className="mt-8"
            />
        </>
    );
}
