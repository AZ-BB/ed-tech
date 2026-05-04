import { flagFromCountryCode } from "@/lib/country-flag-emoji";
import {
  discoveryUiIdFromScholarshipRow,
  type ScholarshipDiscoveryRow,
} from "@/app/(protected)/student/scholarships/_lib/scholarship-row-to-scholarship";

export type DashboardSupabaseClient = ReturnType<
  typeof import("@/utils/supabase-browser").createSupabaseBrowserClient
>;

export type DashboardCollectionCard = {
  key: string;
  flag: string;
  name: string;
  sub: string;
  href: string | null;
};

function formatUniversityLocation(args: {
  city: string | null | undefined;
  state: string | null | undefined;
  countryCode: string | null | undefined;
}): string {
  const city = args.city?.trim() ?? "";
  const state = args.state?.trim() ?? "";
  const cc = args.countryCode?.trim().toUpperCase() ?? "";
  const loc =
    state && city ? `${city}, ${state}` : city || state || cc || "Location TBD";
  if (cc && !loc.includes(cc)) {
    return `${loc} · ${cc}`;
  }
  return loc;
}

function formatScholarshipSub(row: {
  type: string | null;
  coverage: string | null;
}): string {
  const rawType = row.type?.trim() ?? "";
  const typeLabel =
    rawType.length > 0
      ? rawType.charAt(0).toUpperCase() + rawType.slice(1)
      : "Scholarship";
  const cov = String(row.coverage ?? "")
    .trim()
    .toLowerCase();
  const coverageLabel = cov === "partial" ? "Partial coverage" : "Full ride";
  return `${typeLabel} · ${coverageLabel}`;
}

function formatAdvisorSub(years: number | null | undefined): string {
  if (years != null && years > 0) return `${years}+ years experience`;
  return "Advisor";
}

function uniqByEntityId<T>(
  rows: T[],
  getEntityId: (row: T) => string | null,
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const id = getEntityId(row);
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}

function unwrapJoin<T>(joined: T | T[] | null | undefined): T | null {
  if (joined == null) return null;
  return Array.isArray(joined) ? (joined[0] ?? null) : joined;
}

export async function fetchDashboardSavedByTab(
  supabase: DashboardSupabaseClient,
): Promise<DashboardCollectionCard[][]> {
  const [uniRes, schRes, advRes, ambRes] = await Promise.all([
    supabase
      .from("student_activities")
      .select(
        `
        id,
        created_at,
        uni_id,
        universities ( id, name, city, state, country_code )
      `,
      )
      .eq("entity_type", "university")
      .eq("type", "save")
      .order("created_at", { ascending: false }),
    supabase
      .from("student_activities")
      .select(
        `
        id,
        created_at,
        scholarship_id,
        scholarships (
          id,
          discovery_slug,
          name,
          nationality_country_code,
          type,
          coverage,
          discovery_payload
        )
      `,
      )
      .eq("entity_type", "scholarship")
      .eq("type", "save")
      .order("created_at", { ascending: false }),
    supabase
      .from("student_activities")
      .select(
        `
        id,
        created_at,
        advisor_id,
        advisors (
          id,
          first_name,
          last_name,
          nationality_country_code,
          experience_years
        )
      `,
      )
      .eq("entity_type", "advisor")
      .eq("type", "save")
      .order("created_at", { ascending: false }),
    supabase
      .from("student_activities")
      .select(
        `
        id,
        created_at,
        ambassador_id,
        ambassadors (
          id,
          first_name,
          last_name,
          destination_country_code,
          university_name,
          major
        )
      `,
      )
      .eq("entity_type", "ambassador")
      .eq("type", "save")
      .order("created_at", { ascending: false }),
  ]);

  const universities = (() => {
    if (uniRes.error || !uniRes.data) return [];
    const rows = uniqByEntityId(
      uniRes.data as UniActivityRow[],
      (r) => r.uni_id ?? null,
    );
    return rows
      .map((r): DashboardCollectionCard | null => {
        const u = unwrapJoin(r.universities);
        if (!u?.id) return null;
        return {
          key: `uni-save-${u.id}`,
          flag: flagFromCountryCode(u.country_code),
          name: u.name?.trim() || "University",
          sub: formatUniversityLocation({
            city: u.city,
            state: u.state,
            countryCode: u.country_code,
          }),
          href: `/student/universities/${u.id}`,
        };
      })
      .filter((x): x is DashboardCollectionCard => x != null);
  })();

  const scholarships = (() => {
    if (schRes.error || !schRes.data) return [];
    const rows = uniqByEntityId(
      schRes.data as ScholarshipActivityRow[],
      (r) => r.scholarship_id ?? null,
    );
    return rows
      .map((r): DashboardCollectionCard | null => {
        const s = unwrapJoin(r.scholarships);
        if (!s?.id) return null;
        const row = s as unknown as ScholarshipDiscoveryRow;
        const detailId = discoveryUiIdFromScholarshipRow({
          id: row.id,
          discovery_slug: row.discovery_slug,
          discovery_payload: row.discovery_payload,
        });
        return {
          key: `sch-save-${row.id}`,
          flag: flagFromCountryCode(row.nationality_country_code),
          name: row.name?.trim() || "Scholarship",
          sub: formatScholarshipSub({ type: row.type, coverage: row.coverage }),
          href: `/student/scholarships?detail=${encodeURIComponent(detailId)}`,
        };
      })
      .filter((x): x is DashboardCollectionCard => x != null);
  })();

  const advisors = (() => {
    if (advRes.error || !advRes.data) return [];
    const rows = uniqByEntityId(
      advRes.data as AdvisorActivityRow[],
      (r) => r.advisor_id ?? null,
    );
    return rows
      .map((r): DashboardCollectionCard | null => {
        const a = unwrapJoin(r.advisors);
        if (!a?.id) return null;
        const name =
          `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "Advisor";
        return {
          key: `adv-save-${a.id}`,
          flag: flagFromCountryCode(a.nationality_country_code),
          name,
          sub: formatAdvisorSub(a.experience_years),
          href: "/student/advisor-sessions",
        };
      })
      .filter((x): x is DashboardCollectionCard => x != null);
  })();

  const ambassadors = (() => {
    if (ambRes.error || !ambRes.data) return [];
    const rows = uniqByEntityId(
      ambRes.data as AmbassadorActivityRow[],
      (r) => r.ambassador_id ?? null,
    );
    return rows
      .map((r): DashboardCollectionCard | null => {
        const m = unwrapJoin(r.ambassadors);
        if (!m?.id) return null;
        const name =
          `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || "Ambassador";
        const uni = m.university_name?.trim() ?? "";
        const maj = m.major?.trim() ?? "";
        const sub =
          [uni, maj].filter(Boolean).join(" · ") || "Student ambassador";
        return {
          key: `amb-save-${m.id}`,
          flag: flagFromCountryCode(m.destination_country_code),
          name,
          sub,
          href: "/student/ambassadors",
        };
      })
      .filter((x): x is DashboardCollectionCard => x != null);
  })();

  return [universities, scholarships, advisors, ambassadors];
}

export async function fetchDashboardShortlistedUniScholarship(
  supabase: DashboardSupabaseClient,
): Promise<[DashboardCollectionCard[], DashboardCollectionCard[]]> {
  const [uniRes, schRes] = await Promise.all([
    supabase
      .from("student_activities")
      .select(
        `
        id,
        created_at,
        uni_id,
        universities ( id, name, city, state, country_code )
      `,
      )
      .eq("entity_type", "university")
      .eq("type", "shortlist")
      .order("created_at", { ascending: false }),
    supabase
      .from("student_activities")
      .select(
        `
        id,
        created_at,
        scholarship_id,
        scholarships (
          id,
          discovery_slug,
          name,
          nationality_country_code,
          type,
          coverage,
          discovery_payload
        )
      `,
      )
      .eq("entity_type", "scholarship")
      .eq("type", "shortlist")
      .order("created_at", { ascending: false }),
  ]);

  const universities = (() => {
    if (uniRes.error || !uniRes.data) return [];
    const rows = uniqByEntityId(
      uniRes.data as UniActivityRow[],
      (r) => r.uni_id ?? null,
    );
    return rows
      .map((r): DashboardCollectionCard | null => {
        const u = unwrapJoin(r.universities);
        if (!u?.id) return null;
        return {
          key: `uni-shortlist-${u.id}`,
          flag: flagFromCountryCode(u.country_code),
          name: u.name?.trim() || "University",
          sub: formatUniversityLocation({
            city: u.city,
            state: u.state,
            countryCode: u.country_code,
          }),
          href: `/student/universities/${u.id}`,
        };
      })
      .filter((x): x is DashboardCollectionCard => x != null);
  })();

  const scholarships = (() => {
    if (schRes.error || !schRes.data) return [];
    const rows = uniqByEntityId(
      schRes.data as ScholarshipActivityRow[],
      (r) => r.scholarship_id ?? null,
    );
    return rows
      .map((r): DashboardCollectionCard | null => {
        const s = unwrapJoin(r.scholarships);
        if (!s?.id) return null;
        const row = s as unknown as ScholarshipDiscoveryRow;
        const detailId = discoveryUiIdFromScholarshipRow({
          id: row.id,
          discovery_slug: row.discovery_slug,
          discovery_payload: row.discovery_payload,
        });
        return {
          key: `sch-shortlist-${row.id}`,
          flag: flagFromCountryCode(row.nationality_country_code),
          name: row.name?.trim() || "Scholarship",
          sub: formatScholarshipSub({ type: row.type, coverage: row.coverage }),
          href: `/student/scholarships?detail=${encodeURIComponent(detailId)}`,
        };
      })
      .filter((x): x is DashboardCollectionCard => x != null);
  })();

  return [universities, scholarships];
}

type UniActivityRow = {
  uni_id: string | null;
  universities: UniversityJoin | UniversityJoin[] | null;
};

type UniversityJoin = {
  id: string;
  name: string | null;
  city: string | null;
  state: string | null;
  country_code: string | null;
};

type ScholarshipActivityRow = {
  scholarship_id: string | null;
  scholarships: Record<string, unknown> | Record<string, unknown>[] | null;
};

type AdvisorJoin = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  nationality_country_code: string | null;
  experience_years: number | null;
};

type AdvisorActivityRow = {
  advisor_id: string | null;
  advisors: AdvisorJoin | AdvisorJoin[] | null;
};

type AmbassadorJoin = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  destination_country_code: string | null;
  university_name: string | null;
  major: string | null;
};

type AmbassadorActivityRow = {
  ambassador_id: string | null;
  ambassadors: AmbassadorJoin | AmbassadorJoin[] | null;
};
