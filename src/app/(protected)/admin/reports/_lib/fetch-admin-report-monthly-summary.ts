import type { Database } from "@/database.types";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import { fetchAdminReportShortlistStats } from "./fetch-shortlist-stats-rpc";
import { fetchTopSchoolsByStudents } from "./fetch-top-schools";
import { fetchWeeklyActivityInRange } from "./fetch-weekly-activity";
import type { ReportDateBounds } from "./report-date-range";
import type { MonthlySummaryPayload } from "./report-payloads";
import type { AdminReportFilters } from "./report-types";
import {
  buildReportMeta,
  collectActiveStudentIdsInRange,
  countAiUsageInRange,
  countInRangeForStudents,
  fetchStudentIdsForSchool,
} from "./report-scope";

export async function fetchAdminReportMonthlySummary(
  filters: AdminReportFilters,
  bounds: ReportDateBounds,
): Promise<MonthlySummaryPayload> {
  const supabase = await createSupabaseSecretClient();
  const meta = await buildReportMeta(filters, bounds);
  const studentIds = await fetchStudentIdsForSchool(filters.schoolId);
  const studentSet = new Set(studentIds);

  let studentsQuery = supabase
    .from("student_profiles")
    .select("id", { count: "exact", head: true });
  if (filters.schoolId) {
    studentsQuery = studentsQuery.eq("school_id", filters.schoolId);
  }

  let appsStartedQuery = supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .gte("created_at", bounds.startIso)
    .lt("created_at", bounds.endExclusiveIso);
  if (filters.schoolId) {
    appsStartedQuery = appsStartedQuery.eq("school_id", filters.schoolId);
  }

  let appsSubmittedQuery = supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq(
      "status",
      "submitted" satisfies Database["public"]["Enums"]["application_status"],
    )
    .gte("submitted_at", bounds.startIso)
    .lt("submitted_at", bounds.endExclusiveIso);
  if (filters.schoolId) {
    appsSubmittedQuery = appsSubmittedQuery.eq("school_id", filters.schoolId);
  }

  const [
    totalStudentsRes,
    activeSet,
    shortlistStats,
    essayReviews,
    matchingRuns,
    advisorSessions,
    ambassadorSessions,
    appsStartedRes,
    appsSubmittedRes,
    weeklyActivity,
    topSchools,
  ] = await Promise.all([
    studentsQuery,
    collectActiveStudentIdsInRange(
      supabase,
      studentIds,
      studentSet,
      bounds.startIso,
      bounds.endExclusiveIso,
    ),
    fetchAdminReportShortlistStats(filters.schoolId, bounds, 10),
    countAiUsageInRange(
      supabase,
      studentIds,
      bounds.startIso,
      bounds.endExclusiveIso,
      "essay_review",
    ),
    countAiUsageInRange(
      supabase,
      studentIds,
      bounds.startIso,
      bounds.endExclusiveIso,
      "matching",
    ),
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
    appsStartedQuery,
    appsSubmittedQuery,
    fetchWeeklyActivityInRange(studentSet, bounds),
    filters.schoolId ? Promise.resolve([]) : fetchTopSchoolsByStudents(10),
  ]);

  const featureUsage = [
    { label: "Essay reviews", count: essayReviews },
    { label: "AI matching", count: matchingRuns },
    { label: "Advisor sessions", count: advisorSessions },
    { label: "Ambassador sessions", count: ambassadorSessions },
  ].filter((x) => x.count > 0);

  return {
    meta,
    totalStudents: totalStudentsRes.count ?? 0,
    activeInRange: activeSet.size,
    essayReviews,
    matchingRuns,
    advisorSessions,
    ambassadorSessions,
    applicationsStarted: appsStartedRes.count ?? 0,
    applicationsSubmitted: appsSubmittedRes.count ?? 0,
    topSchools,
    topUniversities: shortlistStats.topUniversities,
    topDestinations: shortlistStats.topDestinations,
    weeklyActivity,
    featureUsage,
  };
}
