import { createSupabaseSecretClient } from "@/utils/supabase-server";

import { fetchAdminReportShortlistStats } from "./fetch-shortlist-stats-rpc";
import type { ReportDateBounds } from "./report-date-range";
import type { StudentEngagementPayload } from "./report-payloads";
import type { AdminReportFilters } from "./report-types";
import {
  buildReportMeta,
  countInRangeForStudents,
  fetchStudentIdsForSchool,
} from "./report-scope";

export async function fetchAdminReportStudentEngagement(
  filters: AdminReportFilters,
  bounds: ReportDateBounds,
): Promise<StudentEngagementPayload> {
  const supabase = await createSupabaseSecretClient();
  const meta = await buildReportMeta(filters, bounds);
  const studentIds = await fetchStudentIdsForSchool(filters.schoolId);

  let appsQuery = supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .gte("created_at", bounds.startIso)
    .lt("created_at", bounds.endExclusiveIso);
  if (filters.schoolId) {
    appsQuery = appsQuery.eq("school_id", filters.schoolId);
  }

  const [
    shortlistStats,
    advisorSessions,
    ambassadorSessions,
    appsRes,
  ] = await Promise.all([
    fetchAdminReportShortlistStats(filters.schoolId, bounds, 10),
    countInRangeForStudents(
      supabase,
      "advisor_sessions",
      studentIds,
      bounds.startIso,
      bounds.endExclusiveIso,
    ),
    countInRangeForStudents(
      supabase,
      "ambassador_session_requests",
      studentIds,
      bounds.startIso,
      bounds.endExclusiveIso,
    ),
    appsQuery,
  ]);

  return {
    meta,
    topDestinations: shortlistStats.topDestinations,
    topUniversities: shortlistStats.topUniversities,
    topScholarships: shortlistStats.topScholarships,
    advisorSessions,
    ambassadorSessions,
    applicationsStarted: appsRes.count ?? 0,
    shortlistActions: shortlistStats.shortlistRowCount,
  };
}
