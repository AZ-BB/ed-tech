import type { Database } from "@/database.types";
import { createSupabaseServerClient } from "@/utils/supabase-server";

type DbClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type AmbassadorSessionStatus =
  Database["public"]["Enums"]["ambassador_session_request_status"];

export type AmbassadorSessionStatusFilter = "all" | AmbassadorSessionStatus;

export const AMBASSADOR_SESSION_STATUS_OPTIONS: readonly {
  value: AmbassadorSessionStatusFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rescheduled", label: "Rescheduled" },
] as const;

export type AdminAmbassadorSessionRow = {
  id: number;
  status: string | null;
  requestedAt: string;
  preferredTime: string | null;
  discussionTopics: string | null;
  studentName: string;
  studentEmail: string | null;
};

export type AdminAmbassadorSessionsPanelProps = {
  rows: AdminAmbassadorSessionRow[];
  totalRows: number;
  page: number;
  limit: number;
  status: AmbassadorSessionStatusFilter;
  statusCounts: Record<AmbassadorSessionStatusFilter, number>;
};

function paginationRange(page: number, limit: number) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const from = (safePage - 1) * safeLimit;
  return { from, to: from + safeLimit - 1 };
}

export function parseAmbassadorSessionStatusFilter(
  raw: string | string[] | undefined,
): AmbassadorSessionStatusFilter {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (
    s === "pending" ||
    s === "confirmed" ||
    s === "completed" ||
    s === "cancelled" ||
    s === "rescheduled"
  ) {
    return s;
  }
  return "all";
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

export async function fetchAmbassadorSessionStatusCounts(
  ambassadorId: string,
  client: DbClient,
): Promise<Record<AmbassadorSessionStatusFilter, number>> {
  const [allRes, pendingRes, confirmedRes, completedRes, cancelledRes, rescheduledRes] =
    await Promise.all([
      client
        .from("ambassador_session_requests")
        .select("id", { count: "exact", head: true })
        .eq("ambassador_id", ambassadorId),
      client
        .from("ambassador_session_requests")
        .select("id", { count: "exact", head: true })
        .eq("ambassador_id", ambassadorId)
        .eq("status", "pending"),
      client
        .from("ambassador_session_requests")
        .select("id", { count: "exact", head: true })
        .eq("ambassador_id", ambassadorId)
        .eq("status", "confirmed"),
      client
        .from("ambassador_session_requests")
        .select("id", { count: "exact", head: true })
        .eq("ambassador_id", ambassadorId)
        .eq("status", "completed"),
      client
        .from("ambassador_session_requests")
        .select("id", { count: "exact", head: true })
        .eq("ambassador_id", ambassadorId)
        .eq("status", "cancelled"),
      client
        .from("ambassador_session_requests")
        .select("id", { count: "exact", head: true })
        .eq("ambassador_id", ambassadorId)
        .eq("status", "rescheduled"),
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

export async function fetchAmbassadorSessionsPage(
  ambassadorId: string,
  status: AmbassadorSessionStatusFilter,
  options: { page: number; limit: number; client: DbClient },
): Promise<{ rows: AdminAmbassadorSessionRow[]; totalRows: number }> {
  const { page, limit, client } = options;
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
      student_profiles ( first_name, last_name, email )
    `,
      { count: "exact" },
    )
    .eq("ambassador_id", ambassadorId)
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error("[fetchAmbassadorSessionsPage]", error);
    return { rows: [], totalRows: 0 };
  }

  const rows: AdminAmbassadorSessionRow[] = (data ?? []).map((row) => {
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
    };
  });

  return { rows, totalRows: count ?? 0 };
}

export async function fetchAmbassadorSessionsPanel(
  ambassadorId: string,
  status: AmbassadorSessionStatusFilter,
  options: { page: number; limit: number; client: DbClient },
): Promise<AdminAmbassadorSessionsPanelProps> {
  const [pageResult, statusCounts] = await Promise.all([
    fetchAmbassadorSessionsPage(ambassadorId, status, options),
    fetchAmbassadorSessionStatusCounts(ambassadorId, options.client).catch(() =>
      emptyStatusCounts(),
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
