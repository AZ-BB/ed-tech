import { createSupabaseSecretClient } from "@/utils/supabase-server";

import {
  ADVISOR_SESSION_STATUS_OPTIONS,
  type AdminAdvisorSessionRow,
  type AdvisorSessionStatusFilter,
  parseAdvisorSessionStatusFilter,
} from "@/app/(protected)/admin/users/advisors/[id]/_lib/fetch-advisor-sessions-page";

type DbClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type AdminSchoolAdvisorSessionRow = AdminAdvisorSessionRow & {
  advisorName: string;
};

export type AdminSchoolAdvisorSessionsPanelProps = {
  rows: AdminSchoolAdvisorSessionRow[];
  totalRows: number;
  page: number;
  limit: number;
  status: AdvisorSessionStatusFilter;
  statusCounts: Record<AdvisorSessionStatusFilter, number>;
};

export { ADVISOR_SESSION_STATUS_OPTIONS, parseAdvisorSessionStatusFilter };

function paginationRange(page: number, limit: number) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const from = (safePage - 1) * safeLimit;
  return { from, to: from + safeLimit - 1 };
}

function emptyStatusCounts(): Record<AdvisorSessionStatusFilter, number> {
  return {
    all: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  };
}

async function fetchSchoolStudentIds(
  schoolId: string,
  client: DbClient,
): Promise<string[]> {
  const { data, error } = await client
    .from("student_profiles")
    .select("id")
    .eq("school_id", schoolId);

  if (error) {
    console.error("[admin-school-advisor-sessions] student ids", error);
    return [];
  }

  return (data ?? []).map((row) => row.id);
}

function advisorNameFromEmbed(
  embed:
    | { first_name: string; last_name: string }
    | { first_name: string; last_name: string }[]
    | null
    | undefined,
): string {
  const person = Array.isArray(embed) ? embed[0] : embed;
  if (!person) return "—";
  const name = [person.first_name, person.last_name].filter(Boolean).join(" ").trim();
  return name || "—";
}

export async function fetchSchoolAdvisorSessionStatusCounts(
  schoolId: string,
  studentIds: string[],
  client: DbClient,
): Promise<Record<AdvisorSessionStatusFilter, number>> {
  if (studentIds.length === 0) return emptyStatusCounts();

  const base = () =>
    client
      .from("advisor_sessions")
      .select("id", { count: "exact", head: true })
      .in("student_id", studentIds);

  const [allRes, pendingRes, confirmedRes, completedRes, cancelledRes] =
    await Promise.all([
      base(),
      base().eq("status", "pending"),
      base().eq("status", "confirmed"),
      base().eq("status", "completed"),
      base().eq("status", "cancelled"),
    ]);

  return {
    all: allRes.count ?? 0,
    pending: pendingRes.count ?? 0,
    confirmed: confirmedRes.count ?? 0,
    completed: completedRes.count ?? 0,
    cancelled: cancelledRes.count ?? 0,
  };
}

export async function fetchSchoolAdvisorSessionsPage(
  schoolId: string,
  status: AdvisorSessionStatusFilter,
  options: { page: number; limit: number; client: DbClient },
): Promise<{ rows: AdminSchoolAdvisorSessionRow[]; totalRows: number }> {
  const { page, limit, client } = options;
  const studentIds = await fetchSchoolStudentIds(schoolId, client);

  if (studentIds.length === 0) {
    return { rows: [], totalRows: 0 };
  }

  const { from, to } = paginationRange(page, limit);

  let query = client
    .from("advisor_sessions")
    .select(
      `
      id,
      status,
      booked_at,
      created_at,
      destination_country_code,
      help_with,
      student_name,
      student_email,
      student_profiles ( first_name, last_name, email ),
      advisors:advisor_id ( first_name, last_name )
    `,
      { count: "exact" },
    )
    .in("student_id", studentIds)
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error("[fetchSchoolAdvisorSessionsPage]", error);
    return { rows: [], totalRows: 0 };
  }

  const rows: AdminSchoolAdvisorSessionRow[] = (data ?? []).map((row) => {
    const studentEmbed = row.student_profiles as
      | { first_name: string; last_name: string; email: string }
      | { first_name: string; last_name: string; email: string }[]
      | null;
    const student = Array.isArray(studentEmbed) ? studentEmbed[0] : studentEmbed;
    const profileName = student
      ? [student.first_name, student.last_name].filter(Boolean).join(" ").trim()
      : "";
    const fallbackName = row.student_name?.trim() || profileName || "Student";

    return {
      id: row.id,
      status: row.status,
      bookedAt: row.booked_at,
      createdAt: row.created_at ?? new Date(0).toISOString(),
      destination: row.destination_country_code?.trim() || "—",
      helpWith: row.help_with?.trim() || null,
      studentName: fallbackName,
      studentEmail: row.student_email?.trim() || student?.email?.trim() || null,
      advisorName: advisorNameFromEmbed(row.advisors),
    };
  });

  return { rows, totalRows: count ?? 0 };
}

export async function fetchSchoolAdvisorSessionsPanel(
  schoolId: string,
  status: AdvisorSessionStatusFilter,
  options: { page: number; limit: number; client: DbClient },
): Promise<AdminSchoolAdvisorSessionsPanelProps> {
  const studentIds = await fetchSchoolStudentIds(schoolId, options.client);

  const [pageResult, statusCounts] = await Promise.all([
    fetchSchoolAdvisorSessionsPage(schoolId, status, options),
    fetchSchoolAdvisorSessionStatusCounts(schoolId, studentIds, options.client).catch(
      () => emptyStatusCounts(),
    ),
  ]);

  return {
    ...pageResult,
    page: options.page,
    limit: options.limit,
    status,
    statusCounts,
  };
}
