import type { ApplicationUniversityTargetRow } from "@/lib/application-university-target-mapper";
import {
  mapApplicationUniversityTargetRow,
  type UniversityTargetRaw,
} from "@/lib/application-university-target-mapper";
import {
  parseApplicationPackageData,
  resolveApplicationUniversitiesTotal,
} from "@/lib/application-package-data";
import { resolveCurrentAdvisorId } from "@/lib/advisor-access";
import { UNIVERSITY_TARGETS_SELECT } from "@/lib/fetch-application-university-targets";
import { createSupabaseServerClient } from "@/utils/supabase-server";
import {
  escapeIlike,
  nameEmailSearchOrFilter,
} from "@/app/(protected)/school/_lib/student-search";
import type {
  AdvisorUniversityTargetDecisionFilter,
  AdvisorUniversityTargetStatusFilter,
} from "./parse-advisor-university-targets-filters";

type DbClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type PlanEmbed = {
  name: string;
  universities_count: number;
};

type ApplicationEmbed = {
  id: number;
  student_name: string | null;
  student_email: string | null;
  status: string | null;
  package_data: unknown;
  applications_plans: PlanEmbed | PlanEmbed[] | null;
  student_profiles:
    | ({ first_name: string; last_name: string; email?: string | null })
    | ({ first_name: string; last_name: string; email?: string | null })[]
    | null;
};

type TargetRowRaw = UniversityTargetRaw & {
  applications: ApplicationEmbed | ApplicationEmbed[];
};

export type AdvisorPortalUniversityTargetRow = ApplicationUniversityTargetRow & {
  studentName: string;
  studentEmail: string;
  applicationStatus: string;
  packageLabel: string;
};

export type AdvisorPortalUniversityTargetsPanelProps = {
  rows: AdvisorPortalUniversityTargetRow[];
  totalRows: number;
  page: number;
  limit: number;
  search: string;
  status: AdvisorUniversityTargetStatusFilter;
  decision: AdvisorUniversityTargetDecisionFilter;
};

function paginationRange(page: number, limit: number) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const from = (safePage - 1) * safeLimit;
  return { from, to: from + safeLimit - 1 };
}

function firstEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

function personName(
  first: string | null | undefined,
  last: string | null | undefined,
): string {
  return [first?.trim(), last?.trim()].filter(Boolean).join(" ").trim();
}

function resolvePackageLabel(application: ApplicationEmbed | null): string {
  const plan = application ? firstEmbed(application.applications_plans) : null;
  if (!plan) return "—";

  const packageData = parseApplicationPackageData(application?.package_data);
  const count = resolveApplicationUniversitiesTotal(
    packageData,
    plan.universities_count,
  );
  if (Number.isFinite(count) && count > 0) {
    return `${count} unis`;
  }

  return plan.name?.trim() || "—";
}

async function fetchMatchingStudentIds(
  client: DbClient,
  search: string,
): Promise<string[]> {
  const profileFilter = nameEmailSearchOrFilter(search);
  if (!profileFilter) return [];

  const { data, error } = await client
    .from("student_profiles")
    .select("id")
    .or(profileFilter)
    .limit(200);

  if (error) {
    console.error("[fetchAdvisorUniversityTargetsPage] profile search", error);
    return [];
  }

  return (data ?? []).map((row) => row.id);
}

async function buildUniversityTargetsSearchOrFilter(
  client: DbClient,
  search: string,
): Promise<string | null> {
  const trimmed = search.trim();
  if (!trimmed) return null;

  const e = escapeIlike(trimmed);
  const clauses = [
    `university_name.ilike.%${e}%`,
    `applications.student_name.ilike.%${e}%`,
    `applications.student_email.ilike.%${e}%`,
  ];

  const studentIds = await fetchMatchingStudentIds(client, trimmed);
  if (studentIds.length > 0) {
    const inList = studentIds.map((id) => `"${id}"`).join(",");
    clauses.push(`applications.student_id.in.(${inList})`);
  }

  return clauses.join(",");
}

function mapTargetRow(raw: TargetRowRaw): AdvisorPortalUniversityTargetRow {
  const target = mapApplicationUniversityTargetRow(raw);
  const application = firstEmbed(raw.applications);
  const profile = application ? firstEmbed(application.student_profiles) : null;
  const profileName = profile ? personName(profile.first_name, profile.last_name) : "";
  const studentName =
    profileName || application?.student_name?.trim() || "Student";
  const studentEmail =
    profile?.email?.trim() || application?.student_email?.trim() || "—";

  return {
    ...target,
    studentName,
    studentEmail,
    applicationStatus: application?.status?.trim() || "lead",
    packageLabel: resolvePackageLabel(application),
  };
}

async function fetchAdvisorUniversityTargetsPage(
  advisorId: string,
  options: {
    page: number;
    limit: number;
    search: string;
    status: AdvisorUniversityTargetStatusFilter;
    decision: AdvisorUniversityTargetDecisionFilter;
    client: DbClient;
  },
): Promise<{ rows: AdvisorPortalUniversityTargetRow[]; totalRows: number }> {
  const { page, limit, search, status, decision, client } = options;
  const { from, to } = paginationRange(page, limit);

  let query = client
    .from("application_university_targets")
    .select(
      `
      ${UNIVERSITY_TARGETS_SELECT},
      applications!inner (
        id,
        student_name,
        student_email,
        status,
        assigned_to,
        package_data,
        applications_plans ( name, universities_count ),
        student_profiles ( first_name, last_name, email )
      )
    `,
      { count: "exact" },
    )
    .eq("applications.assigned_to", advisorId)
    .order("created_at", { ascending: false })
    .order("sort_order", { ascending: true });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (decision !== "all") {
    query = query.eq("decision", decision);
  }

  const searchOrFilter = await buildUniversityTargetsSearchOrFilter(client, search);
  if (searchOrFilter) {
    query = query.or(searchOrFilter);
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error("[fetchAdvisorUniversityTargetsPage]", error);
    return { rows: [], totalRows: 0 };
  }

  const rows = (data ?? []).map((row) => mapTargetRow(row as TargetRowRaw));
  return { rows, totalRows: count ?? 0 };
}

export async function fetchAdvisorPortalUniversityTargetsPanel(options: {
  page: number;
  limit: number;
  search: string;
  status: AdvisorUniversityTargetStatusFilter;
  decision: AdvisorUniversityTargetDecisionFilter;
}): Promise<AdvisorPortalUniversityTargetsPanelProps | null> {
  const supabase = await createSupabaseServerClient();
  const advisorId = await resolveCurrentAdvisorId(supabase);
  if (!advisorId) return null;

  const search = options.search.trim();

  const pageResult = await fetchAdvisorUniversityTargetsPage(advisorId, {
    page: options.page,
    limit: options.limit,
    search,
    status: options.status,
    decision: options.decision,
    client: supabase,
  });

  return {
    ...pageResult,
    page: options.page,
    limit: options.limit,
    search,
    status: options.status,
    decision: options.decision,
  };
}
