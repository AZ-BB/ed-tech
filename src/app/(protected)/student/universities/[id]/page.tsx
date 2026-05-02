import type { Json } from "@/database.types";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { MajorProgramBlock } from "./_components/university-detail-view";
import { UniversityDetailView } from "./_components/university-detail-view";

type PageParams = { id: string };

const tuitionFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
});

const DEFAULT_DOCS = [
    "Personal statement",
    "1–2 recommendation letters",
    "Official transcripts",
    "Proof of English proficiency",
    "Passport copy",
];

function documentListFromJson(doc: Json | null): string[] {
    if (doc == null) return DEFAULT_DOCS;
    if (Array.isArray(doc)) {
        const out = doc.filter((x): x is string => typeof x === "string");
        return out.length > 0 ? out : DEFAULT_DOCS;
    }
    if (typeof doc === "object" && doc !== null && "items" in doc) {
        const items = (doc as { items: unknown }).items;
        if (Array.isArray(items)) {
            const out = items.filter((x): x is string => typeof x === "string");
            return out.length > 0 ? out : DEFAULT_DOCS;
        }
    }
    return DEFAULT_DOCS;
}

function formatLocation(city: string, state: string | null, countryName: string, countryCode: string): string {
    const country = countryName?.trim() || countryCode;
    if (state?.trim()) return `${city}, ${state}, ${country}`;
    return `${city}, ${country}`;
}

function formatTuitionUsd(n: number | null): string {
    if (n == null || Number.isNaN(n)) return "—";
    return `${tuitionFormatter.format(n)}/yr`;
}

function tuitionSentenceUsd(n: number | null): string {
    if (n == null || Number.isNaN(n)) return "Contact the university — varies by program";
    return `${tuitionFormatter.format(n)} per year`;
}

function formatLivingUsd(n: number | null): string {
    if (n == null || Number.isNaN(n)) return "—";
    return `~${tuitionFormatter.format(n)} / year`;
}

function formatApplicationFee(n: number | null): string {
    if (n == null || Number.isNaN(n)) return "—";
    if (n === 0) return "Waived";
    return tuitionFormatter.format(n);
}

function formatDeadline(iso: string | null, isPriority: boolean): string {
    if (!iso) return "—";
    const d = new Date(iso + (iso.includes("T") ? "" : "T12:00:00"));
    if (Number.isNaN(d.getTime())) return "—";
    const base = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return isPriority ? `${base} (priority)` : base;
}

function formatAcceptance(rate: number | null): string {
    if (rate == null) return "—";
    return `~${rate}%`;
}

function formatIelts(score: number | null): string {
    if (score == null) return "—";
    return Number.isInteger(score) ? String(score) : String(score);
}

function formatToefl(score: number | null): string | null {
    if (score == null) return null;
    return String(score);
}

function satBadgeFromPolicy(policy: string | null): "optional" | "required" | "neutral" {
    if (!policy?.trim()) return "neutral";
    const l = policy.toLowerCase();
    if (l.includes("optional")) return "optional";
    if (l.includes("required") || l.includes("mandatory")) return "required";
    return "neutral";
}

function formatRanking(n: number | null): string | null {
    if (n == null) return null;
    return `Top ${n}`;
}

function formatIntlStudents(n: number | null): string | null {
    if (n == null) return null;
    return `~${n}%`;
}

type UnivMajorProgramRow = {
    programs: { name: string } | null;
};

type UnivMajorRow = {
    majors: { name: string } | null;
    university_major_programs: UnivMajorProgramRow[] | null;
};

type UniversityRow = {
    id: string;
    name: string;
    city: string;
    state: string | null;
    country_code: string;
    is_public: boolean;
    description: string | null;
    logo_url: string | null;
    tuition_per_year: number | null;
    deadline_date: string | null;
    is_priority: boolean;
    ielts_min_score: number | null;
    sat_policy: string | null;
    acceptance_rate: number | null;
    ranking: number | null;
    intl_students: number | null;
    website_url: string | null;
    email: string | null;
    admission_page_url: string | null;
    application_fee: number | null;
    method: string | null;
    intakes: string | null;
    estimated_living_cost_per_year: number | null;
    is_scholarship_available: boolean;
    toefl_min_score: number | null;
    documents: Json | null;
    countries: { name: string } | null;
    university_majors: UnivMajorRow[] | null;
};

function buildMajorBlocks(rows: UnivMajorRow[] | null): MajorProgramBlock[] {
    if (!rows?.length) return [];
    return rows.map((row) => {
        const majorName = row.majors?.name?.trim() || "Program area";
        const programs =
            row.university_major_programs
                ?.map((p) => p.programs?.name?.trim())
                .filter((n): n is string => Boolean(n)) ?? [];
        return { majorName, programs };
    });
}

function topMajorNamesFromBlocks(blocks: MajorProgramBlock[], limit: number): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const b of blocks) {
        if (seen.has(b.majorName)) continue;
        seen.add(b.majorName);
        out.push(b.majorName);
        if (out.length >= limit) break;
    }
    return out;
}

export async function generateMetadata(props: { params: Promise<PageParams> }): Promise<Metadata> {
    const { id } = await props.params;
    const supabase = await createSupabaseSecretClient();
    const { data } = await supabase.from("universities").select("name").eq("id", id).maybeSingle();
    const name = data?.name;
    return { title: name ? `${name} · UniApply` : "University · UniApply" };
}

export default async function StudentUniversityDetailPage(props: { params: Promise<PageParams> }) {
    const { id } = await props.params;
    const supabase = await createSupabaseSecretClient();

    const { data: raw, error } = await supabase
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
            ranking,
            intl_students,
            website_url,
            email,
            admission_page_url,
            application_fee,
            method,
            intakes,
            estimated_living_cost_per_year,
            is_scholarship_available,
            toefl_min_score,
            documents,
            difficulty,
            countries ( name ),
            university_majors (
                majors ( name ),
                university_major_programs (
                    programs ( name )
                )
            )
            `,
        )
        .eq("id", id)
        .maybeSingle();

    if (error) {
        console.error(error);
    }
    if (!raw) {
        notFound();
    }

    const row = raw as UniversityRow & { difficulty?: string | null };
    const countryName = row.countries?.name ?? row.country_code;
    const majorBlocks = buildMajorBlocks(row.university_majors);
    const totalPrograms = majorBlocks.reduce((acc, b) => acc + b.programs.length, 0);
    const topNames = topMajorNamesFromBlocks(majorBlocks, 8);

    const difficultyRaw = row.difficulty?.trim().toLowerCase();
    const difficultyLabel =
        difficultyRaw === "easy" || difficultyRaw === "medium" || difficultyRaw === "hard"
            ? difficultyRaw
            : null;

    const scholarshipNote = row.is_scholarship_available
        ? "Scholarships may be available to qualified students. Check the university website for the latest details."
        : null;

    const model = {
        id: row.id,
        name: row.name,
        locationLine: formatLocation(row.city, row.state, countryName, row.country_code),
        isPublic: row.is_public,
        logoUrl: row.logo_url,
        description: row.description,
        topMajorNames: topNames,
        tuitionDisplay: formatTuitionUsd(row.tuition_per_year),
        tuitionSentence: tuitionSentenceUsd(row.tuition_per_year),
        deadlineFormatted: formatDeadline(row.deadline_date, row.is_priority),
        ieltsFormatted: formatIelts(row.ielts_min_score),
        satPolicy: row.sat_policy,
        satBadge: satBadgeFromPolicy(row.sat_policy),
        toeflFormatted: formatToefl(row.toefl_min_score),
        methodFormatted: row.method?.trim() || "—",
        feeFormatted: formatApplicationFee(row.application_fee),
        intakesFormatted: row.intakes?.trim() || "—",
        livingFormatted: formatLivingUsd(row.estimated_living_cost_per_year),
        scholarshipsAvailable: row.is_scholarship_available,
        scholarshipNote,
        acceptanceFormatted: formatAcceptance(row.acceptance_rate),
        rankingFormatted: formatRanking(row.ranking),
        intlStudentsFormatted: formatIntlStudents(row.intl_students),
        difficultyLabel,
        websiteUrl: row.website_url,
        admissionUrl: row.admission_page_url,
        email: row.email,
        documents: documentListFromJson(row.documents),
        majorBlocks,
        totalPrograms,
    };

    return <UniversityDetailView uni={model} />;
}
