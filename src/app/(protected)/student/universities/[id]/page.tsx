import type { Json } from "@/database.types";
import { applyUniversityLocalization } from "@/lib/content-localization";
import { getServerLocale } from "@/lib/i18n/get-server-locale";
import { studentDiscoveryAr } from "@/lib/i18n/dictionaries/student-discovery-ar";
import { studentDiscoveryEn } from "@/lib/i18n/dictionaries/student-discovery-en";
import type { Locale } from "@/lib/i18n/config";
import { pickCatalogName } from "@/lib/translation/translate-major-program-catalog";
import { SCHOLARSHIP_NOTE_EN } from "@/lib/university-translatable-fields";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
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

function formatApplicationFee(n: number | null): string {
    if (n == null || Number.isNaN(n)) return "—";
    if (n === 0) return "Waived";
    return tuitionFormatter.format(n);
}

function formatDeadline(
    iso: string | null,
    isPriority: boolean,
    locale: string,
    prioritySuffix: string,
): string {
    if (!iso) return "—";
    const d = new Date(iso + (iso.includes("T") ? "" : "T12:00:00"));
    if (Number.isNaN(d.getTime())) return "—";
    const dateLocale = locale === "ar" ? "ar" : "en-US";
    const base = d.toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" });
    return isPriority ? `${base} ${prioritySuffix}` : base;
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
    programs: { name: string; name_ar: string | null } | null;
};

type UnivMajorRow = {
    majors: { name: string; name_ar: string | null } | null;
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
    cover_image_url: string | null;
    tuition_per_year: number | null;
    tuition_display: string | null;
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
    living_display: string | null;
    is_scholarship_available: boolean;
    toefl_min_score: number | null;
    documents: Json | null;
    content_ar: Json | null;
    countries: { name: string } | null;
    university_majors: UnivMajorRow[] | null;
};

function buildMajorBlocks(rows: UnivMajorRow[] | null, locale: Locale): MajorProgramBlock[] {
    if (!rows?.length) return [];
    return rows.map((row) => {
        const majorName = pickCatalogName(locale, row.majors?.name, row.majors?.name_ar);
        const programs =
            row.university_major_programs
                ?.map((p) =>
                    pickCatalogName(locale, p.programs?.name, p.programs?.name_ar, ""),
                )
                .filter((n): n is string => Boolean(n)) ?? [];
        return { majorName, programs };
    });
}

function hasArabicCatalog(rows: UnivMajorRow[] | null): boolean {
    for (const row of rows ?? []) {
        if (row.majors?.name_ar?.trim()) return true;
        for (const link of row.university_major_programs ?? []) {
            if (link.programs?.name_ar?.trim()) return true;
        }
    }
    return false;
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
    return { title: name ? `${name} · Univeera` : "University · Univeera" };
}

export default async function StudentUniversityDetailPage(props: { params: Promise<PageParams> }) {
    const { id } = await props.params;
    const locale = await getServerLocale();
    const supabase = await createSupabaseServerClient();

    const { data: raw, error } = await supabase
        .from("universities")
        .select(
            `
            *,
            countries ( name ),
            university_majors (
                majors ( name, name_ar ),
                university_major_programs (
                    programs ( name, name_ar )
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

    const row = raw as unknown as UniversityRow & { difficulty?: string | null };
    const majorBlocks = buildMajorBlocks(row.university_majors, locale);
    const totalPrograms = majorBlocks.reduce((acc, b) => acc + b.programs.length, 0);
    const topNames = topMajorNamesFromBlocks(majorBlocks, 8);

    const {
        data: { user },
    } = await supabase.auth.getUser();

    let is_shortlisted = false;
    let is_favourite = false;
    if (user) {
        const { data: activityRows } = await supabase
            .from("student_activities")
            .select("type")
            .eq("student_id", user.id)
            .eq("uni_id", id)
            .eq("entity_type", "university");
        let has_viewed = false;
        for (const ar of activityRows ?? []) {
            if (ar.type === "shortlist") is_shortlisted = true;
            if (ar.type === "save") is_favourite = true;
            if (ar.type === "viewed") has_viewed = true;
        }
        if (!has_viewed) {
            const { error: viewedError } = await supabase.from("student_activities").insert({
                student_id: user.id,
                uni_id: id,
                entity_type: "university",
                type: "viewed",
            });
            if (viewedError) {
                console.error(viewedError);
            }
        }
    }

    const difficultyRaw = row.difficulty?.trim().toLowerCase();
    const difficultyLabel =
        difficultyRaw === "easy" || difficultyRaw === "medium" || difficultyRaw === "hard"
            ? difficultyRaw
            : null;

    const scholarshipNoteEn = row.is_scholarship_available ? SCHOLARSHIP_NOTE_EN : null;
    const enDocuments = documentListFromJson(row.documents);

    const localized = applyUniversityLocalization(
        locale,
        {
            name: row.name,
            city: row.city,
            country_code: row.country_code,
            description: row.description,
            tuition_display: row.tuition_display,
            tuition_per_year: row.tuition_per_year,
            living_display: row.living_display,
            estimated_living_cost_per_year: row.estimated_living_cost_per_year,
            sat_policy: row.sat_policy,
            method: row.method,
            intakes: row.intakes,
            documents: row.documents,
            is_scholarship_available: row.is_scholarship_available,
        },
        row.content_ar,
        enDocuments,
        scholarshipNoteEn,
    );

    const model = {
        id: row.id,
        name: localized.name,
        city: localized.city ?? row.city,
        state: row.state,
        countryName: localized.countryName ?? row.countries?.name ?? row.country_code,
        countryCode: row.country_code,
        isPublic: row.is_public,
        logoUrl: row.logo_url,
        coverImageUrl: row.cover_image_url?.trim() || null,
        description: localized.description,
        topMajorNames: topNames,
        tuitionDisplay: localized.tuitionDisplay,
        tuitionSentence: localized.tuitionSentence,
        deadlineFormatted: formatDeadline(
            row.deadline_date,
            row.is_priority,
            locale,
            locale === "ar"
                ? studentDiscoveryAr.universities.prioritySuffix
                : studentDiscoveryEn.universities.prioritySuffix,
        ),
        ieltsFormatted: formatIelts(row.ielts_min_score),
        satPolicy: localized.satPolicy,
        satBadge: satBadgeFromPolicy(row.sat_policy),
        toeflFormatted: formatToefl(row.toefl_min_score),
        methodFormatted: localized.methodFormatted,
        feeFormatted: formatApplicationFee(row.application_fee),
        intakesFormatted: localized.intakesFormatted,
        livingFormatted: localized.livingFormatted,
        scholarshipsAvailable: row.is_scholarship_available,
        scholarshipNote: localized.scholarshipNote,
        acceptanceFormatted: formatAcceptance(row.acceptance_rate),
        rankingFormatted: formatRanking(row.ranking),
        intlStudentsFormatted: formatIntlStudents(row.intl_students),
        difficultyLabel,
        websiteUrl: row.website_url,
        admissionUrl: row.admission_page_url,
        email: row.email,
        documents: localized.documents,
        majorBlocks,
        totalPrograms,
        is_shortlisted,
        is_favourite,
        useRtlContent: localized.useRtlContent || (locale === "ar" && hasArabicCatalog(row.university_majors)),
    };

    return <UniversityDetailView uni={model} />;
}
