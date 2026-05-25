import type { Database } from "@/database.types";
import { createSupabaseServerClient } from "@/utils/supabase-server";

type DbClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type AdvisorSessionStatus = Database["public"]["Enums"]["advisor_session_status"];

export type AdvisorSessionStatusFilter = "all" | AdvisorSessionStatus;

export const ADVISOR_SESSION_STATUS_OPTIONS: readonly {
  value: AdvisorSessionStatusFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export type AdminAdvisorSessionRow = {
  id: number;
  status: string | null;
  bookedAt: string | null;
  createdAt: string;
  destination: string;
  helpWith: string | null;
  studentName: string;
  studentEmail: string | null;
};

export type AdminAdvisorSessionsPanelProps = {
  rows: AdminAdvisorSessionRow[];
  totalRows: number;
  page: number;
  limit: number;
  status: AdvisorSessionStatusFilter;
  statusCounts: Record<AdvisorSessionStatusFilter, number>;
};

function paginationRange(page: number, limit: number) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const from = (safePage - 1) * safeLimit;
  return { from, to: from + safeLimit - 1 };
}

export function parseAdvisorSessionStatusFilter(
  raw: string | string[] | undefined,
): AdvisorSessionStatusFilter {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (
    s === "pending" ||
    s === "confirmed" ||
    s === "completed" ||
    s === "cancelled"
  ) {
    return s;
  }
  return "all";
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

export async function fetchAdvisorSessionStatusCounts(
  advisorId: string,
  client: DbClient,
): Promise<Record<AdvisorSessionStatusFilter, number>> {
  const [allRes, pendingRes, confirmedRes, completedRes, cancelledRes] =
    await Promise.all([
      client
        .from("advisor_sessions")
        .select("id", { count: "exact", head: true })
        .eq("advisor_id", advisorId),
      client
        .from("advisor_sessions")
        .select("id", { count: "exact", head: true })
        .eq("advisor_id", advisorId)
        .eq("status", "pending"),
      client
        .from("advisor_sessions")
        .select("id", { count: "exact", head: true })
        .eq("advisor_id", advisorId)
        .eq("status", "confirmed"),
      client
        .from("advisor_sessions")
        .select("id", { count: "exact", head: true })
        .eq("advisor_id", advisorId)
        .eq("status", "completed"),
      client
        .from("advisor_sessions")
        .select("id", { count: "exact", head: true })
        .eq("advisor_id", advisorId)
        .eq("status", "cancelled"),
    ]);

  return {
    all: allRes.count ?? 0,
    pending: pendingRes.count ?? 0,
    confirmed: confirmedRes.count ?? 0,
    completed: completedRes.count ?? 0,
    cancelled: cancelledRes.count ?? 0,
  };
}

export async function fetchAdvisorSessionsPage(
  advisorId: string,
  status: AdvisorSessionStatusFilter,
  options: { page: number; limit: number; client: DbClient },
): Promise<{ rows: AdminAdvisorSessionRow[]; totalRows: number }> {
  const { page, limit, client } = options;
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
      student_profiles ( first_name, last_name, email )
    `,
      { count: "exact" },
    )
    .eq("advisor_id", advisorId)
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error("[fetchAdvisorSessionsPage]", error);
    return { rows: [], totalRows: 0 };
  }

  const rows: AdminAdvisorSessionRow[] = (data ?? []).map((row) => {
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
    };
  });

  return { rows, totalRows: count ?? 0 };
}

export async function fetchAdvisorSessionsPanel(
  advisorId: string,
  status: AdvisorSessionStatusFilter,
  options: { page: number; limit: number; client: DbClient },
): Promise<AdminAdvisorSessionsPanelProps> {
  const [pageResult, statusCounts] = await Promise.all([
    fetchAdvisorSessionsPage(advisorId, status, options),
    fetchAdvisorSessionStatusCounts(advisorId, options.client).catch(() =>
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
