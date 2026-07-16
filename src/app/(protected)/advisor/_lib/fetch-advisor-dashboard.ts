import { resolveCurrentAdvisorId } from "@/lib/advisor-access";
import { fetchAdvisorPortalUniversityTargetsPanel } from "@/app/(protected)/advisor/applications/_lib/fetch-advisor-portal-university-targets-page";
import { fetchAdvisorNewLeadsPanel } from "@/app/(protected)/advisor/leads/_lib/fetch-advisor-new-leads-page";
import { fetchAdvisorActivePackagesPanel } from "@/app/(protected)/advisor/packages/_lib/fetch-advisor-active-packages-page";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

import {
  EMPTY_ADVISOR_DASHBOARD,
  parseAdvisorDashboard,
  type AdvisorDashboardPayload,
  type AdvisorDashboardUpcomingDeadline,
} from "./parse-advisor-dashboard";

export type { AdvisorDashboardPayload } from "./parse-advisor-dashboard";

function startOfLocalWeek(now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = d.getDay(); // 0 Sun … 6 Sat — match Postgres date_trunc('week') (Mon)
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isInCurrentWeek(
  isoOrDate: string | null | undefined,
  weekStart: Date,
  weekEnd: Date,
): boolean {
  if (!isoOrDate) return false;
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) {
    const dateOnly = new Date(`${isoOrDate.trim()}T12:00:00`);
    if (Number.isNaN(dateOnly.getTime())) return false;
    return dateOnly >= weekStart && dateOnly < weekEnd;
  }
  return d >= weekStart && d < weekEnd;
}

/** All-time sessions & calls for the advisor (includes completed; excludes cancelled sessions). */
async function fetchSessionsAndCallsAllTimeKpi(): Promise<{
  total: number;
  thisWeek: number;
}> {
  const supabase = await createSupabaseServerClient();
  const advisorId = await resolveCurrentAdvisorId(supabase);
  if (!advisorId) return { total: 0, thisWeek: 0 };

  const secret = await createSupabaseSecretClient();
  const now = new Date();
  const weekStart = startOfLocalWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [
    { data: sessions, error: sessionsErr },
    { data: apps, error: appsErr },
    { data: postCases, error: postCasesErr },
  ] = await Promise.all([
    secret
      .from("advisor_sessions")
      .select("booked_at, status")
      .eq("advisor_id", advisorId)
      .not("booked_at", "is", null),
    secret
      .from("applications")
      .select("id, scheduled_at")
      .eq("assigned_to", advisorId),
    secret
      .from("post_admission_cases")
      .select("id, scheduled_at")
      .eq("assigned_to", advisorId),
  ]);

  if (sessionsErr) console.error("[sessionsAndCallsKpi] sessions", sessionsErr);
  if (appsErr) console.error("[sessionsAndCallsKpi] apps", appsErr);
  if (postCasesErr) console.error("[sessionsAndCallsKpi] postCases", postCasesErr);

  const meetingAts: string[] = [];

  for (const row of sessions ?? []) {
    if (row.status === "cancelled") continue;
    if (row.booked_at) meetingAts.push(row.booked_at);
  }
  for (const row of apps ?? []) {
    if (row.scheduled_at) meetingAts.push(row.scheduled_at);
  }
  for (const row of postCases ?? []) {
    if (row.scheduled_at) meetingAts.push(row.scheduled_at);
  }

  const appIds = (apps ?? []).map((a) => a.id);
  const postIds = (postCases ?? []).map((c) => c.id);

  if (appIds.length > 0) {
    const { data: appCalls, error: appCallsErr } = await secret
      .from("application_calls")
      .select("call_date")
      .in("application_id", appIds);
    if (appCallsErr) console.error("[sessionsAndCallsKpi] appCalls", appCallsErr);
    for (const row of appCalls ?? []) {
      if (row.call_date) meetingAts.push(row.call_date);
    }
  }

  if (postIds.length > 0) {
    const { data: postCalls, error: postCallsErr } = await secret
      .from("post_admission_calls")
      .select("call_date")
      .in("post_admission_case_id", postIds);
    if (postCallsErr) console.error("[sessionsAndCallsKpi] postCalls", postCallsErr);
    for (const row of postCalls ?? []) {
      if (row.call_date) meetingAts.push(row.call_date);
    }
  }

  const thisWeek = meetingAts.filter((at) =>
    isInCurrentWeek(at, weekStart, weekEnd),
  ).length;

  return { total: meetingAts.length, thisWeek };
}

/** Same total as `/advisor/leads` with no search filter. */
async function fetchLeadsPageCount(): Promise<number> {
  const panel = await fetchAdvisorNewLeadsPanel({
    page: 1,
    limit: 1,
    search: "",
  });
  return panel?.totalRows ?? 0;
}

/** Same total as `/advisor/packages` with no search filter. */
async function fetchPayingCustomersPageCount(): Promise<number> {
  const panel = await fetchAdvisorActivePackagesPanel({
    page: 1,
    limit: 1,
    search: "",
  });
  return panel?.totalRows ?? 0;
}

/** Same total as applications tracker (`/advisor/applications`) with default filters. */
async function fetchApplicationsTrackerCount(): Promise<number> {
  const panel = await fetchAdvisorPortalUniversityTargetsPanel({
    page: 1,
    limit: 1,
    search: "",
    status: "all",
    decision: "all",
  });
  return panel?.totalRows ?? 0;
}

async function enrichDeadlineApplicationIds(
  deadlines: AdvisorDashboardUpcomingDeadline[],
): Promise<AdvisorDashboardUpcomingDeadline[]> {
  if (deadlines.length === 0) return deadlines;

  const missingStudentIds = [
    ...new Set(
      deadlines
        .filter((d) => d.applicationId == null)
        .map((d) => d.studentId)
        .filter(Boolean),
    ),
  ];
  if (missingStudentIds.length === 0) return deadlines;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("applications")
    .select("id, student_id, status")
    .in("student_id", missingStudentIds)
    .order("id", { ascending: false });

  if (error) {
    console.error("[fetchAdvisorDashboard] enrich deadlines", error.message);
    return deadlines;
  }

  const studentToAppId = new Map<string, number>();
  for (const row of data ?? []) {
    const studentId = row.student_id?.trim();
    if (!studentId || studentToAppId.has(studentId)) continue;
    if (row.status === "active_package") {
      studentToAppId.set(studentId, row.id);
    }
  }
  for (const row of data ?? []) {
    const studentId = row.student_id?.trim();
    if (!studentId || studentToAppId.has(studentId)) continue;
    studentToAppId.set(studentId, row.id);
  }

  return deadlines.map((d) => ({
    ...d,
    applicationId: d.applicationId ?? studentToAppId.get(d.studentId) ?? null,
  }));
}

export async function fetchAdvisorDashboard(): Promise<AdvisorDashboardPayload> {
  const supabase = await createSupabaseServerClient();

  const [
    { data, error },
    sessionsAndCalls,
    leadsTotal,
    payingCustomersTotal,
    applicationsInProgressTotal,
  ] = await Promise.all([
    supabase.rpc("advisor_dashboard"),
    fetchSessionsAndCallsAllTimeKpi(),
    fetchLeadsPageCount(),
    fetchPayingCustomersPageCount(),
    fetchApplicationsTrackerCount(),
  ]);

  if (error) {
    console.error("[fetchAdvisorDashboard]", error.message);
    return {
      ...EMPTY_ADVISOR_DASHBOARD,
      kpis: {
        ...EMPTY_ADVISOR_DASHBOARD.kpis,
        sessionsAndCalls,
        newLeads: {
          total: leadsTotal,
          awaitingFirstCall: 0,
        },
        activePackages: {
          total: payingCustomersTotal,
          newThisMonth: 0,
        },
        applicationsInProgress: {
          total: applicationsInProgressTotal,
          studentCount: 0,
        },
      },
    };
  }

  const parsed = parseAdvisorDashboard(data);
  const upcomingDeadlines = await enrichDeadlineApplicationIds(
    parsed.upcomingDeadlines,
  );

  return {
    ...parsed,
    upcomingDeadlines,
    kpis: {
      ...parsed.kpis,
      sessionsAndCalls,
      newLeads: {
        ...parsed.kpis.newLeads,
        total: leadsTotal,
      },
      activePackages: {
        ...parsed.kpis.activePackages,
        total: payingCustomersTotal,
      },
      applicationsInProgress: {
        ...parsed.kpis.applicationsInProgress,
        total: applicationsInProgressTotal,
      },
    },
  };
}
