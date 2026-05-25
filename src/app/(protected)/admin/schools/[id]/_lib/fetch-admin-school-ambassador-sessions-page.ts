import { createSupabaseSecretClient } from "@/utils/supabase-server";

import {
  AMBASSADOR_SESSION_STATUS_OPTIONS,
  type AdminAmbassadorSessionRow,
  type AmbassadorSessionStatusFilter,
  parseAmbassadorSessionStatusFilter,
} from "@/app/(protected)/admin/users/ambassadors/[id]/_lib/fetch-ambassador-sessions-page";

type DbClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type AdminSchoolAmbassadorSessionRow = AdminAmbassadorSessionRow & {
  ambassadorName: string;
};

export type AdminSchoolAmbassadorSessionsPanelProps = {
  rows: AdminSchoolAmbassadorSessionRow[];
  totalRows: number;
  page: number;
  limit: number;
  status: AmbassadorSessionStatusFilter;
  statusCounts: Record<AmbassadorSessionStatusFilter, number>;
};

export { AMBASSADOR_SESSION_STATUS_OPTIONS, parseAmbassadorSessionStatusFilter };

function paginationRange(page: number, limit: number) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const from = (safePage - 1) * safeLimit;
  return { from, to: from + safeLimit - 1 };
}

function emptyStatusCounts(): Record<AmbassadorSessionStatusFilter, number> {
  return {
    all: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    rescheduled: 0,
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
    console.error("[admin-school-ambassador-sessions] student ids", error);
    return [];
  }

  return (data ?? []).map((row) => row.id);
}

function ambassadorNameFromEmbed(
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

export async function fetchSchoolAmbassadorSessionStatusCounts(
  studentIds: string[],
  client: DbClient,
): Promise<Record<AmbassadorSessionStatusFilter, number>> {
  if (studentIds.length === 0) return emptyStatusCounts();

  const base = () =>
    client
      .from("ambassador_session_requests")
      .select("id", { count: "exact", head: true })
      .in("student_id", studentIds);

  const [allRes, pendingRes, confirmedRes, completedRes, cancelledRes, rescheduledRes] =
    await Promise.all([
      base(),
      base().eq("status", "pending"),
      base().eq("status", "confirmed"),
      base().eq("status", "completed"),
      base().eq("status", "cancelled"),
      base().eq("status", "rescheduled"),
    ]);

  return {
    all: allRes.count ?? 0,
    pending: pendingRes.count ?? 0,
    confirmed: confirmedRes.count ?? 0,
    completed: completedRes.count ?? 0,
    cancelled: cancelledRes.count ?? 0,
    rescheduled: rescheduledRes.count ?? 0,
  };
}

export async function fetchSchoolAmbassadorSessionsPage(
  schoolId: string,
  status: AmbassadorSessionStatusFilter,
  options: { page: number; limit: number; client: DbClient },
): Promise<{ rows: AdminSchoolAmbassadorSessionRow[]; totalRows: number }> {
  const { page, limit, client } = options;
  const studentIds = await fetchSchoolStudentIds(schoolId, client);

  if (studentIds.length === 0) {
    return { rows: [], totalRows: 0 };
  }

  const { from, to } = paginationRange(page, limit);

  let query = client
    .from("ambassador_session_requests")
    .select(
      `
      id,
      status,
      created_at,
      pref_time_1,
      discussion_topics,
      student_name,
      student_email,
      student_profiles ( first_name, last_name, email ),
      ambassadors:ambassador_id ( first_name, last_name )
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
    console.error("[fetchSchoolAmbassadorSessionsPage]", error);
    return { rows: [], totalRows: 0 };
  }

  const rows: AdminSchoolAmbassadorSessionRow[] = (data ?? []).map((row) => {
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
      requestedAt: row.created_at ?? new Date(0).toISOString(),
      preferredTime: row.pref_time_1?.trim() || null,
      discussionTopics: row.discussion_topics?.trim() || null,
      studentName: fallbackName,
      studentEmail: row.student_email?.trim() || student?.email?.trim() || null,
      ambassadorName: ambassadorNameFromEmbed(row.ambassadors),
    };
  });

  return { rows, totalRows: count ?? 0 };
}

export async function fetchSchoolAmbassadorSessionsPanel(
  schoolId: string,
  status: AmbassadorSessionStatusFilter,
  options: { page: number; limit: number; client: DbClient },
): Promise<AdminSchoolAmbassadorSessionsPanelProps> {
  const studentIds = await fetchSchoolStudentIds(schoolId, options.client);

  const [pageResult, statusCounts] = await Promise.all([
    fetchSchoolAmbassadorSessionsPage(schoolId, status, options),
    fetchSchoolAmbassadorSessionStatusCounts(studentIds, options.client).catch(
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
