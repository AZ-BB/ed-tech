import { formatCreditAssignerName } from "@/lib/student-credit-assignment-log";
import type {
  StudentUsageHistoryItem,
  StudentUsageHistoryKind,
  StudentUsageHistoryKindCounts,
} from "@/lib/student-usage-history";
import { emptyStudentUsageHistoryKindCounts } from "@/lib/student-usage-history";
import { createSupabaseServerClient } from "@/utils/supabase-server";

type DbClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function personNameFromEmbed(
  embed:
    | { first_name: string; last_name: string }
    | { first_name: string; last_name: string }[]
    | null
    | undefined,
): string | null {
  const person = Array.isArray(embed) ? embed[0] : embed;
  if (!person) return null;
  const name = [person.first_name, person.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || null;
}

function paginationRange(page: number, limit: number) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const from = (safePage - 1) * safeLimit;
  return { from, to: from + safeLimit - 1 };
}

export async function fetchStudentUsageHistoryCounts(
  studentId: string,
  client: DbClient,
): Promise<StudentUsageHistoryKindCounts> {
  const [
    advisorRes,
    ambassadorRes,
    essayRes,
    matchingRes,
    creditRes,
  ] = await Promise.all([
    client
      .from("advisor_sessions")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId),
    client
      .from("ambassador_session_requests")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId),
    client
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("type", "essay_review"),
    client
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("type", "matching"),
    client
      .from("student_credits_history")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("status", "added"),
  ]);

  return {
    advisor_session: advisorRes.count ?? 0,
    ambassador_session: ambassadorRes.count ?? 0,
    essay_review: essayRes.count ?? 0,
    ai_matching: matchingRes.count ?? 0,
    credit_assignment: creditRes.count ?? 0,
  };
}

export async function fetchStudentUsageHistoryPage(
  studentId: string,
  kind: StudentUsageHistoryKind,
  options: { page: number; limit: number; client: DbClient },
): Promise<{ rows: StudentUsageHistoryItem[]; totalRows: number }> {
  const { page, limit, client } = options;
  const { from, to } = paginationRange(page, limit);

  switch (kind) {
    case "advisor_session": {
      const { data, count, error } = await client
        .from("advisor_sessions")
        .select(
          `
          id,
          status,
          booked_at,
          created_at,
          destination_country_code,
          help_with,
          advisors ( first_name, last_name )
        `,
          { count: "exact" },
        )
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("[fetchStudentUsageHistoryPage] advisor_sessions", error);
        return { rows: [], totalRows: 0 };
      }

      const rows: StudentUsageHistoryItem[] = (data ?? []).map((row) => ({
        id: String(row.id),
        kind: "advisor_session",
        at: row.booked_at ?? row.created_at ?? new Date(0).toISOString(),
        status: row.status,
        detail: row.help_with?.trim() || null,
        personName: personNameFromEmbed(row.advisors),
        destination: row.destination_country_code?.trim() || null,
        model: null,
        tokens: null,
        creditType: null,
        creditAmount: null,
        addedBy: null,
      }));

      return { rows, totalRows: count ?? 0 };
    }

    case "ambassador_session": {
      const { data, count, error } = await client
        .from("ambassador_session_requests")
        .select(
          `
          id,
          status,
          created_at,
          discussion_topics,
          ambassadors ( first_name, last_name )
        `,
          { count: "exact" },
        )
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error(
          "[fetchStudentUsageHistoryPage] ambassador_session_requests",
          error,
        );
        return { rows: [], totalRows: 0 };
      }

      const rows: StudentUsageHistoryItem[] = (data ?? []).map((row) => ({
        id: String(row.id),
        kind: "ambassador_session",
        at: row.created_at ?? new Date(0).toISOString(),
        status: row.status,
        detail: row.discussion_topics?.trim() || null,
        personName: personNameFromEmbed(row.ambassadors),
        destination: null,
        model: null,
        tokens: null,
        creditType: null,
        creditAmount: null,
        addedBy: null,
      }));

      return { rows, totalRows: count ?? 0 };
    }

    case "essay_review":
    case "ai_matching": {
      const aiType = kind === "essay_review" ? "essay_review" : "matching";
      const { data, count, error } = await client
        .from("ai_usage")
        .select("id, type, model, tokens, created_at", { count: "exact" })
        .eq("student_id", studentId)
        .eq("type", aiType)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("[fetchStudentUsageHistoryPage] ai_usage", error);
        return { rows: [], totalRows: 0 };
      }

      const rows: StudentUsageHistoryItem[] = (data ?? []).map((row) => ({
        id: String(row.id),
        kind,
        at: row.created_at ?? new Date(0).toISOString(),
        status: null,
        detail: null,
        personName: null,
        destination: null,
        model: row.model,
        tokens: row.tokens,
        creditType: null,
        creditAmount: null,
        addedBy: null,
      }));

      return { rows, totalRows: count ?? 0 };
    }

    case "credit_assignment": {
      const { data, count, error } = await client
        .from("student_credits_history")
        .select(
          `
          id,
          amount,
          type,
          status,
          created_at,
          admins:assigned_by_admin_id ( first_name, last_name ),
          school_admin_profiles:assigned_by_school_admin_id ( first_name, last_name )
        `,
          { count: "exact" },
        )
        .eq("student_id", studentId)
        .eq("status", "added")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error(
          "[fetchStudentUsageHistoryPage] student_credits_history",
          error,
        );
        return { rows: [], totalRows: 0 };
      }

      const rows: StudentUsageHistoryItem[] = (data ?? []).map((row) => {
        const adminEmbed = row.admins as
          | { first_name: string; last_name: string }
          | { first_name: string; last_name: string }[]
          | null;
        const admin = Array.isArray(adminEmbed) ? adminEmbed[0] : adminEmbed;

        const schoolAdminEmbed = row.school_admin_profiles as
          | { first_name: string; last_name: string }
          | { first_name: string; last_name: string }[]
          | null;
        const schoolAdmin = Array.isArray(schoolAdminEmbed)
          ? schoolAdminEmbed[0]
          : schoolAdminEmbed;

        const addedBy = formatCreditAssignerName({
          adminFirst: admin?.first_name,
          adminLast: admin?.last_name,
          schoolAdminFirst: schoolAdmin?.first_name,
          schoolAdminLast: schoolAdmin?.last_name,
        });

        const creditType =
          row.type === "advisor" || row.type === "ambassador" ? row.type : null;

        return {
          id: String(row.id),
          kind: "credit_assignment",
          at: row.created_at ?? new Date(0).toISOString(),
          status: row.status,
          detail: `Added by ${addedBy}`,
          personName: null,
          destination: null,
          model: null,
          tokens: null,
          creditType,
          creditAmount: row.amount,
          addedBy,
        };
      });

      return { rows, totalRows: count ?? 0 };
    }

    default:
      return { rows: [], totalRows: 0 };
  }
}

export async function fetchStudentUsageHistoryPanel(
  studentId: string,
  kind: StudentUsageHistoryKind,
  options: { page: number; limit: number; client: DbClient },
) {
  const [pageResult, kindCounts] = await Promise.all([
    fetchStudentUsageHistoryPage(studentId, kind, options),
    fetchStudentUsageHistoryCounts(studentId, options.client).catch(() =>
      emptyStudentUsageHistoryKindCounts(),
    ),
  ]);

  return {
    ...pageResult,
    kind,
    page: options.page,
    limit: options.limit,
    kindCounts,
  };
}
