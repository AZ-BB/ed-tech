import { createSupabaseSecretClient } from "@/utils/supabase-server";

import { parseAdminReportShortlistTopStats } from "./parse-admin-report-shortlist-stats";
import type { ReportDateBounds } from "./report-date-range";
import {
  collectActiveStudentIdsInRange,
  fetchStudentIdsForSchool,
} from "./report-scope";
import type { AdminReportsOverview } from "./report-payloads";

async function sumTokensInRange(
  studentIds: string[],
  startIso: string,
  endExclusiveIso: string,
): Promise<number> {
  const supabase = await createSupabaseSecretClient();
  const studentSet = new Set(studentIds);
  let total = 0;
  let from = 0;
  const PAGE = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from("ai_usage")
      .select("student_id, tokens")
      .gte("created_at", startIso)
      .lt("created_at", endExclusiveIso)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("[fetchAdminReportsOverview] ai_usage tokens", error.message);
      break;
    }
    if (!data?.length) break;
    for (const row of data) {
      if (row.student_id && studentSet.has(row.student_id)) {
        total += row.tokens ?? 0;
      }
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return total;
}

export async function fetchAdminReportsOverview(
  schoolId: string,
  bounds: ReportDateBounds,
): Promise<AdminReportsOverview> {
  const supabase = await createSupabaseSecretClient();
  const studentIds = await fetchStudentIdsForSchool(schoolId);
  const studentSet = new Set(studentIds);

  let studentsQuery = supabase
    .from("student_profiles")
    .select("id", { count: "exact", head: true });
  if (schoolId) studentsQuery = studentsQuery.eq("school_id", schoolId);
  const studentsRes = await studentsQuery;

  const [activeSet, shortlistRpc, tokensUsed] = await Promise.all([
    collectActiveStudentIdsInRange(
      supabase,
      studentIds,
      studentSet,
      bounds.startIso,
      bounds.endExclusiveIso,
    ),
    supabase.rpc("admin_report_shortlist_top_stats", {
      p_school_id: schoolId ?? undefined,
      p_start: bounds.startIso,
      p_end: bounds.endExclusiveIso,
      p_top_n: 1,
    }),
    sumTokensInRange(studentIds, bounds.startIso, bounds.endExclusiveIso),
  ]);

  const shortlistStats = parseAdminReportShortlistTopStats(shortlistRpc.data);

  return {
    totalUsers: studentsRes.count ?? studentIds.length,
    activeInRange: activeSet.size,
    totalShortlists: shortlistStats.shortlistRowCount,
    tokensUsed,
  };
}
