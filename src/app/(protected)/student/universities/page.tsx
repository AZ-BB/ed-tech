import { Pagination } from "@/components/pagination";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { Suspense } from "react";
import { UniversitiesFilter } from "./_components/universities-filter";
import { UniversityCard } from "./_components/university-card";

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

type UniversitiesPageSearchParams = {
    major_id?: string;
    program_id?: string;
    country_code?: string;
    search?: string;
    uni_type?: string;
    difficulty?: string;
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

    const supabase = await createSupabaseSecretClient();

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

    let countQuery = supabase
        .from("universities")
        .select("id", { count: "exact", head: true });
    countQuery = applyUniversitiesFilters(countQuery, filterCtx);
    const { count: universitiesCount, error: countError } = await countQuery;

    if (countError) {
        console.error(countError);
    }

    const totalRows = universitiesCount ?? 0;
    const { safePage, offset } = paginationTotals(
        totalRows,
        pageParam,
        limitParam,
    );

    let listQuery = supabase
        .from("universities")
        .select(
            `
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
            ${universityMajorsEmbed}
            `,
        );
    listQuery = applyUniversitiesFilters(listQuery, filterCtx);
    listQuery = listQuery
        .order("created_at", { ascending: false })
        .range(offset, offset + limitParam - 1);

    const { data: universitiesRaw, error: universitiesError } = await listQuery;

    if (universitiesError) {
        console.error(universitiesError);
    }



    const universities =
        universitiesRaw?.map((row) => {
            const country = row.countries as { name: string } | null;
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
            };
        }) ?? [];

    return (
        <>
            <div className="mb-5">
                <h1 className="serif mb-1 text-[26px] font-normal leading-tight text-[var(--text)]">
                    Explore universities
                </h1>
                <p className="text-sm leading-normal text-[var(--text-light)]">
                    Search and compare universities based on your interests,
                    goals, and admission profile.
                </p>
            </div>

            <Suspense fallback={
                <div
                    className="mb-5 h-[188px] rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white/70"
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
