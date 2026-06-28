import type { Database } from "@/database.types";
import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import { hydrateApplicationsPlansEmbeds } from "@/lib/applications-plans";
import { createSupabaseServerClient } from "@/utils/supabase-server";

import {
  ADMIN_APPLICATION_STATUS_LABEL,
  type ApplicationStatus,
} from "@/app/(protected)/admin/applications/_lib/application-status-labels";

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

type AppRowRaw = {
  id: number;
  plan_id: number;
  student_name: string | null;
  student_email: string | null;
  school_name: string | null;
  status: string | null;
  assigned_at: string | null;
  created_at: string | null;
  preferences_universities: PreferencesUniversities;
  applications_plans:
    | { name: string; universities_count: number }
    | { name: string; universities_count: number }[]
    | null;
  schools: { name: string } | { name: string }[] | null;
  student_profiles:
    | ({ first_name: string; last_name: string; email?: string | null })
    | ({ first_name: string; last_name: string; email?: string | null })[]
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

export type AdminAdvisorApplicationsPanelProps = {
  rows: AdminAdvisorApplicationRow[];
  totalRows: number;
  page: number;
  limit: number;
  status: AdvisorApplicationStatusFilter;
  statusCounts: Record<AdvisorApplicationStatusFilter, number>;
  search: string;
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

function parsePreferencesUniversities(json: PreferencesUniversities): string[] {
  if (!json || !Array.isArray(json)) return [];
  return json
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

function mapApplicationRow(row: AppRowRaw): AdminAdvisorApplicationRow {
  const profile = firstEmbed(row.student_profiles);
  const profileName = profile ? personName(profile.first_name, profile.last_name) : "";
  const studentName =
    profileName || row.student_name?.trim() || "Student";
  const studentEmail =
    profile?.email?.trim() || row.student_email?.trim() || "—";

  const school = firstEmbed(row.schools);
  const schoolName = school?.name?.trim() || row.school_name?.trim() || "—";

  const plan = firstEmbed(row.applications_plans);
  let packageLabel = "—";
  if (plan) {
    const count = plan.universities_count;
    if (Number.isFinite(count) && count > 0) {
      packageLabel = `${count} ${count === 1 ? "university" : "universities"}`;
    } else {
      packageLabel = plan.name?.trim() || "—";
    }
  }

  const unis = parsePreferencesUniversities(row.preferences_universities);

  return {
    id: row.id,
    studentName,
    studentEmail,
    schoolName,
    packageLabel,
    universitiesLabel: unis.length > 0 ? unis.join(", ") : "—",
    status: row.status?.trim() || "new",
    assignedAt: row.assigned_at,
    createdAt: row.created_at ?? new Date(0).toISOString(),
  };
}

export function parseAdvisorApplicationStatusFilter(
  raw: string | string[] | undefined,
): AdvisorApplicationStatusFilter {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (
    s === "new" ||
    s === "scheduled" ||
    s === "assigned" ||
    s === "in_progress" ||
    s === "submitted" ||
    s === "blocked"
  ) {
    return s === "assigned" ? "scheduled" : s;
  }
  return "all";
}

function emptyStatusCounts(): Record<AdvisorApplicationStatusFilter, number> {
  return {
    all: 0,
    new: 0,
    scheduled: 0,
    payment_in_progress: 0,
    payment_completed: 0,
    in_progress: 0,
    submitted: 0,
    blocked: 0,
  };
}

async function countApplications(
  client: DbClient,
  advisorId: string,
  status?: ApplicationStatusEnum,
  search?: string,
): Promise<number> {
  let query = client
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("assigned_to", advisorId);

  if (status) {
    query = query.eq("status", status);
  }

  const searchTrim = search?.trim() ?? "";
  if (searchTrim) {
    const e = escapeIlike(searchTrim);
    query = query.or(
      `student_name.ilike.%${e}%,student_email.ilike.%${e}%,school_name.ilike.%${e}%`,
    );
  }

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
    newCount,
    scheduled,
    paymentInProgress,
    paymentCompleted,
    inProgress,
    submitted,
    blocked,
  ] = await Promise.all([
    countApplications(client, advisorId, undefined, search),
    countApplications(client, advisorId, "new", search),
    countApplications(client, advisorId, "scheduled", search),
    countApplications(client, advisorId, "payment_in_progress", search),
    countApplications(client, advisorId, "payment_completed", search),
    countApplications(client, advisorId, "in_progress", search),
    countApplications(client, advisorId, "submitted", search),
    countApplications(client, advisorId, "blocked", search),
  ]);

  return {
    all,
    new: newCount,
    scheduled,
    payment_in_progress: paymentInProgress,
    payment_completed: paymentCompleted,
    in_progress: inProgress,
    submitted,
    blocked,
  };
}

export async function fetchAdvisorApplicationsPage(
  advisorId: string,
  status: AdvisorApplicationStatusFilter,
  options: { page: number; limit: number; client: DbClient; search?: string },
): Promise<{ rows: AdminAdvisorApplicationRow[]; totalRows: number }> {
  const { page, limit, client, search } = options;
  const { from, to } = paginationRange(page, limit);

  let query = client
    .from("applications")
    .select(
      `
      id,
      plan_id,
      student_name,
      student_email,
      school_name,
      status,
      assigned_at,
      created_at,
      preferences_universities,
      applications_plans!applications_plan_id_fkey ( name, universities_count ),
      schools ( name ),
      student_profiles ( first_name, last_name, email )
    `,
      { count: "exact" },
    )
    .eq("assigned_to", advisorId)
    .order("assigned_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const searchTrim = search?.trim() ?? "";
  if (searchTrim) {
    const e = escapeIlike(searchTrim);
    query = query.or(
      `student_name.ilike.%${e}%,student_email.ilike.%${e}%,school_name.ilike.%${e}%`,
    );
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error("[fetchAdvisorApplicationsPage]", error);
    return { rows: [], totalRows: 0 };
  }

  const hydratedRows = await hydrateApplicationsPlansEmbeds(
    client,
    (data ?? []) as unknown as AppRowRaw[],
  );
  const rows = hydratedRows.map(mapApplicationRow);
  return { rows, totalRows: count ?? 0 };
}

export async function fetchAdvisorApplicationsPanel(
  advisorId: string,
  status: AdvisorApplicationStatusFilter,
  options: { page: number; limit: number; client: DbClient; search?: string },
): Promise<AdminAdvisorApplicationsPanelProps> {
  const search = options.search?.trim() ?? "";
  const [pageResult, statusCounts] = await Promise.all([
    fetchAdvisorApplicationsPage(advisorId, status, options),
    fetchAdvisorApplicationStatusCounts(advisorId, options.client, search).catch(() =>
      emptyStatusCounts(),
    ),
  ]);

  return {
    ...pageResult,
    page: options.page,
    limit: options.limit,
    status,
    statusCounts,
    search,
  };
}
