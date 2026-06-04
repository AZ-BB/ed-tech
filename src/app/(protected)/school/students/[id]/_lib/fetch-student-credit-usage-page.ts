import {
  formatCreditHistoryAmount,
  formatCreditHistoryStatus,
  formatCreditAssignerName,
} from "@/lib/student-credit-assignment-log";
import type {
  StudentCreditUsageItem,
  StudentCreditUsagePanelProps,
} from "@/lib/student-credit-usage";
import {
  formatStudentCreditReference,
  formatStudentCreditTypeLabel,
} from "@/lib/student-credit-usage";
import { createSupabaseServerClient } from "@/utils/supabase-server";

type DbClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function paginationRange(page: number, limit: number) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const from = (safePage - 1) * safeLimit;
  return { from, to: from + safeLimit - 1 };
}

export async function fetchStudentCreditUsagePage(
  studentId: string,
  options: { page: number; limit: number; client: DbClient },
): Promise<{ rows: StudentCreditUsageItem[]; totalRows: number }> {
  const { page, limit, client } = options;
  const { from, to } = paginationRange(page, limit);

  const { data, count, error } = await client
    .from("student_credits_history")
    .select(
      `
      id,
      amount,
      type,
      status,
      created_at,
      advisor_session_id,
      ambassador_session_request_id,
      admins:assigned_by_admin_id ( first_name, last_name ),
      school_admin_profiles:assigned_by_school_admin_id ( first_name, last_name )
    `,
      { count: "exact" },
    )
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[fetchStudentCreditUsagePage] student_credits_history", error);
    return { rows: [], totalRows: 0 };
  }

  const rows: StudentCreditUsageItem[] = (data ?? []).map((row) => {
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

    const actorName = formatCreditAssignerName({
      adminFirst: admin?.first_name,
      adminLast: admin?.last_name,
      schoolAdminFirst: schoolAdmin?.first_name,
      schoolAdminLast: schoolAdmin?.last_name,
    });

    const creditType = String(row.type ?? "");
    const status = row.status;

    return {
      id: String(row.id),
      at: row.created_at ?? new Date(0).toISOString(),
      amount: row.amount,
      creditType,
      creditTypeLabel: formatStudentCreditTypeLabel(creditType),
      status,
      statusLabel: formatCreditHistoryStatus(status),
      amountDisplay: formatCreditHistoryAmount(row.amount, status),
      reference: formatStudentCreditReference({
        advisorSessionId: row.advisor_session_id,
        ambassadorSessionRequestId: row.ambassador_session_request_id,
      }),
      actorName: actorName === "—" ? null : actorName,
    };
  });

  return { rows, totalRows: count ?? 0 };
}

export async function fetchStudentCreditUsagePanel(
  studentId: string,
  options: { page: number; limit: number; client: DbClient },
): Promise<StudentCreditUsagePanelProps> {
  const pageResult = await fetchStudentCreditUsagePage(studentId, options);
  return {
    ...pageResult,
    page: options.page,
    limit: options.limit,
  };
}
