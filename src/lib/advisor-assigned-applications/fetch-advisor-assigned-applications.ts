import type { Database } from "@/database.types";
import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import {
  ADMIN_APPLICATION_STATUS_LABEL,
  type ApplicationStatus,
} from "@/app/(protected)/admin/applications/_lib/application-status-labels";
import {
  aggregateDestinations,
  type AdvisorStudentManagementStatus,
  type DestinationPill,
  type DeadlineRiskLevel,
  resolveDeadlineRisk,
} from "@/lib/advisor-student-derivations";
import { hydrateApplicationsPlansEmbeds } from "@/lib/applications-plans";
import type { createSupabaseServerClient } from "@/utils/supabase-server";

type DbClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type ApplicationStatusEnum = Database["public"]["Enums"]["application_status"];

export type AdvisorApplicationStatusFilter = "all" | ApplicationStatusEnum;

export const ADVISOR_APPLICATION_STATUS_OPTIONS: readonly {
  value: AdvisorApplicationStatusFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  ...(Object.keys(ADMIN_APPLICATION_STATUS_LABEL) as ApplicationStatus[]).map(
    (status) => ({
      value: status as AdvisorApplicationStatusFilter,
      label: ADMIN_APPLICATION_STATUS_LABEL[status],
    }),
  ),
] as const;

type PreferencesUniversities = unknown;

export type AdvisorAssignedApplicationRaw = {
  id: number;
  plan_id: number;
  student_id: string;
  student_name: string | null;
  student_email: string | null;
  school_name: string | null;
  status: string | null;
  assigned_at: string | null;
  created_at: string | null;
  scheduled_at: string | null;
  preferred_uni_or_countries: string | null;
  preferences_universities: PreferencesUniversities;
  applications_plans:
    | { name: string; universities_count: number }
    | { name: string; universities_count: number }[]
    | null;
  schools: { name: string } | { name: string }[] | null;
  student_profiles:
    | { first_name: string; last_name: string; email?: string | null }
    | { first_name: string; last_name: string; email?: string | null }[]
    | null;
};

export type AdminAdvisorApplicationRow = {
  id: number;
  studentName: string;
  studentEmail: string;
  schoolName: string;
  packageLabel: string;
  universitiesLabel: string;
  status: string;
  assignedAt: string | null;
  createdAt: string;
};

export type AdvisorAssignedApplicationRow = {
  applicationId: number;
  studentId: string;
  studentName: string;
  studentInitials: string;
  studentEmail: string;
  schoolName: string;
  packageLabel: string;
  status: AdvisorStudentManagementStatus;
  initialMeetingDate: string | null;
  destinations: DestinationPill[];
  deadlineRiskLevel: DeadlineRiskLevel;
  deadlineRiskLabel: string;
};

type ApplicationTargetRow = {
  application_id: number;
  country_code: string | null;
  deadline: string | null;
};

type ApplicationCallRow = {
  application_id: number;
  call_date: string;
};

type ApplicationEnrichment = {
  targetCountriesByApp: Map<number, string[]>;
  deadlinesByApp: Map<number, string[]>;
  firstCallDateByApp: Map<number, string>;
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

function studentInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  const pair = `${a}${b}`.toUpperCase();
  return pair || "?";
}

function parsePreferencesUniversities(json: PreferencesUniversities): string[] {
  if (!json || !Array.isArray(json)) return [];
  return json
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeApplicationStatus(status: string): AdvisorStudentManagementStatus {
  const value = status.trim();
  if (
    value === "active_package" ||
    value === "payment_requested" ||
    value === "not_suitable" ||
    value === "lead"
  ) {
    return value;
  }
  return "lead";
}

function resolvePackageLabel(
  plan: { name: string; universities_count: number } | null,
): string {
  if (!plan) return "—";
  const count = plan.universities_count;
  if (Number.isFinite(count) && count > 0) {
    return `${count} ${count === 1 ? "university" : "universities"}`;
  }
  return plan.name?.trim() || "—";
}

function resolveStudentFields(row: AdvisorAssignedApplicationRaw) {
  const profile = firstEmbed(row.student_profiles);
  const profileName = profile
    ? personName(profile.first_name, profile.last_name)
    : "";
  const studentName = profileName || row.student_name?.trim() || "Student";
  const studentEmail =
    profile?.email?.trim() || row.student_email?.trim() || "—";
  const school = firstEmbed(row.schools);
  const schoolName = school?.name?.trim() || row.school_name?.trim() || "—";
  const plan = firstEmbed(row.applications_plans);

  return { studentName, studentEmail, schoolName, plan };
}

export function mapToAdminAdvisorApplicationRow(
  row: AdvisorAssignedApplicationRaw,
): AdminAdvisorApplicationRow {
  const { studentName, studentEmail, schoolName, plan } =
    resolveStudentFields(row);
  const unis = parsePreferencesUniversities(row.preferences_universities);

  return {
    id: row.id,
    studentName,
    studentEmail,
    schoolName,
    packageLabel: resolvePackageLabel(plan),
    universitiesLabel: unis.length > 0 ? unis.join(", ") : "—",
    status: row.status?.trim() || "lead",
    assignedAt: row.assigned_at,
    createdAt: row.created_at ?? new Date(0).toISOString(),
  };
}

export function mapToAdvisorAssignedApplicationRow(
  row: AdvisorAssignedApplicationRaw,
  enrichment: ApplicationEnrichment,
): AdvisorAssignedApplicationRow {
  const { studentName, studentEmail, schoolName, plan } =
    resolveStudentFields(row);
  const preferredDestinations = parsePreferencesUniversities(
    row.preferences_universities,
  );
  const targetCountries = enrichment.targetCountriesByApp.get(row.id) ?? [];
  const deadlines = enrichment.deadlinesByApp.get(row.id) ?? [];
  const destinations = aggregateDestinations({
    universityTargetCountries: targetCountries,
    preferredDestinations,
    preferredUniOrCountries: row.preferred_uni_or_countries,
  });
  const deadlineRisk = resolveDeadlineRisk(deadlines);

  const initialMeetingDate =
    row.scheduled_at?.trim() ||
    enrichment.firstCallDateByApp.get(row.id) ||
    null;

  return {
    applicationId: row.id,
    studentId: row.student_id,
    studentName,
    studentInitials: studentInitials(studentName),
    studentEmail,
    schoolName,
    packageLabel: resolvePackageLabel(plan),
    status: normalizeApplicationStatus(row.status?.trim() || "lead"),
    initialMeetingDate,
    destinations,
    deadlineRiskLevel: deadlineRisk.level,
    deadlineRiskLabel: deadlineRisk.label,
  };
}

export function parseAdvisorApplicationStatusFilter(
  raw: string | string[] | undefined,
): AdvisorApplicationStatusFilter {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (
    s === "intake_draft" ||
    s === "lead" ||
    s === "not_suitable" ||
    s === "payment_requested" ||
    s === "active_package"
  ) {
    return s;
  }
  if (s === "new" || s === "scheduled" || s === "assigned") return "lead";
  if (s === "payment_in_progress") return "payment_requested";
  if (
    s === "payment_completed" ||
    s === "in_progress" ||
    s === "submitted"
  ) {
    return "active_package";
  }
  if (s === "blocked") return "not_suitable";
  return "all";
}

function emptyStatusCounts(): Record<AdvisorApplicationStatusFilter, number> {
  return {
    all: 0,
    intake_draft: 0,
    lead: 0,
    not_suitable: 0,
    payment_requested: 0,
    active_package: 0,
  };
}

function applyAssignedApplicationsFilters(
  query: ReturnType<DbClient["from"]>,
  advisorId: string,
  status?: ApplicationStatusEnum,
  search?: string,
) {
  let filtered = query.eq("assigned_to", advisorId);

  if (status) {
    filtered = filtered.eq("status", status);
  }

  const searchTrim = search?.trim() ?? "";
  if (searchTrim) {
    const e = escapeIlike(searchTrim);
    filtered = filtered.or(
      `student_name.ilike.%${e}%,student_email.ilike.%${e}%,school_name.ilike.%${e}%`,
    );
  }

  return filtered;
}

async function countApplications(
  client: DbClient,
  advisorId: string,
  status?: ApplicationStatusEnum,
  search?: string,
): Promise<number> {
  const query = applyAssignedApplicationsFilters(
    client.from("applications").select("id", { count: "exact", head: true }),
    advisorId,
    status,
    search,
  );

  const { count, error } = await query;
  if (error) {
    console.error("[fetchAdvisorApplicationStatusCounts]", error);
    return 0;
  }
  return count ?? 0;
}

export async function fetchAdvisorApplicationStatusCounts(
  advisorId: string,
  client: DbClient,
  search?: string,
): Promise<Record<AdvisorApplicationStatusFilter, number>> {
  const [
    all,
    intakeDraft,
    lead,
    notSuitable,
    paymentRequested,
    activePackage,
  ] = await Promise.all([
    countApplications(client, advisorId, undefined, search),
    countApplications(client, advisorId, "intake_draft", search),
    countApplications(client, advisorId, "lead", search),
    countApplications(client, advisorId, "not_suitable", search),
    countApplications(client, advisorId, "payment_requested", search),
    countApplications(client, advisorId, "active_package", search),
  ]);

  return {
    all,
    intake_draft: intakeDraft,
    lead,
    not_suitable: notSuitable,
    payment_requested: paymentRequested,
    active_package: activePackage,
  };
}

const ASSIGNED_APPLICATIONS_SELECT = `
  id,
  plan_id,
  student_id,
  student_name,
  student_email,
  school_name,
  status,
  assigned_at,
  created_at,
  scheduled_at,
  preferred_uni_or_countries,
  preferences_universities,
  applications_plans!applications_plan_id_fkey ( name, universities_count ),
  schools ( name ),
  student_profiles ( first_name, last_name, email )
`;

export async function fetchAdvisorAssignedApplicationsPage(
  advisorId: string,
  status: AdvisorApplicationStatusFilter,
  options: { page: number; limit: number; client: DbClient; search?: string },
): Promise<{ rows: AdvisorAssignedApplicationRaw[]; totalRows: number }> {
  const { page, limit, client, search } = options;
  const { from, to } = paginationRange(page, limit);

  let query = client
    .from("applications")
    .select(ASSIGNED_APPLICATIONS_SELECT, { count: "exact" })
    .order("assigned_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  query = applyAssignedApplicationsFilters(
    query,
    advisorId,
    status !== "all" ? status : undefined,
    search,
  );

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error("[fetchAdvisorAssignedApplicationsPage]", error);
    return { rows: [], totalRows: 0 };
  }

  const hydratedRows = await hydrateApplicationsPlansEmbeds(
    client,
    (data ?? []) as unknown as AdvisorAssignedApplicationRaw[],
  );

  return { rows: hydratedRows, totalRows: count ?? 0 };
}

export async function fetchApplicationEnrichment(
  client: DbClient,
  applicationIds: number[],
): Promise<ApplicationEnrichment> {
  const targetCountriesByApp = new Map<number, string[]>();
  const deadlinesByApp = new Map<number, string[]>();
  const firstCallDateByApp = new Map<number, string>();

  if (applicationIds.length === 0) {
    return { targetCountriesByApp, deadlinesByApp, firstCallDateByApp };
  }

  const [targetsResult, callsResult] = await Promise.all([
    client
      .from("application_university_targets")
      .select("application_id, country_code, deadline")
      .in("application_id", applicationIds),
    client
      .from("application_calls")
      .select("application_id, call_date")
      .in("application_id", applicationIds)
      .eq("status", "completed")
      .order("call_date", { ascending: true }),
  ]);

  if (targetsResult.error) {
    console.error("[fetchApplicationEnrichment] targets", targetsResult.error);
  } else {
    for (const row of (targetsResult.data ?? []) as ApplicationTargetRow[]) {
      const appId = row.application_id;
      if (row.country_code?.trim()) {
        const countries = targetCountriesByApp.get(appId) ?? [];
        countries.push(row.country_code.trim());
        targetCountriesByApp.set(appId, countries);
      }
      if (row.deadline?.trim()) {
        const deadlines = deadlinesByApp.get(appId) ?? [];
        deadlines.push(row.deadline.trim());
        deadlinesByApp.set(appId, deadlines);
      }
    }
  }

  if (callsResult.error) {
    console.error("[fetchApplicationEnrichment] calls", callsResult.error);
  } else {
    for (const row of (callsResult.data ?? []) as ApplicationCallRow[]) {
      if (!firstCallDateByApp.has(row.application_id)) {
        firstCallDateByApp.set(row.application_id, row.call_date);
      }
    }
  }

  return { targetCountriesByApp, deadlinesByApp, firstCallDateByApp };
}

export async function fetchAdvisorAssignedApplicationsPanel(
  advisorId: string,
  status: AdvisorApplicationStatusFilter,
  options: { page: number; limit: number; client: DbClient; search?: string },
): Promise<{
  rows: AdvisorAssignedApplicationRow[];
  totalRows: number;
  page: number;
  limit: number;
  status: AdvisorApplicationStatusFilter;
  statusCounts: Record<AdvisorApplicationStatusFilter, number>;
  search: string;
}> {
  const search = options.search?.trim() ?? "";
  const [pageResult, statusCounts] = await Promise.all([
    fetchAdvisorAssignedApplicationsPage(advisorId, status, options),
    fetchAdvisorApplicationStatusCounts(advisorId, options.client, search).catch(
      () => emptyStatusCounts(),
    ),
  ]);

  const applicationIds = pageResult.rows.map((row) => row.id);
  const enrichment = await fetchApplicationEnrichment(
    options.client,
    applicationIds,
  );
  const rows = pageResult.rows.map((row) =>
    mapToAdvisorAssignedApplicationRow(row, enrichment),
  );

  return {
    rows,
    totalRows: pageResult.totalRows,
    page: options.page,
    limit: options.limit,
    status,
    statusCounts,
    search,
  };
}
