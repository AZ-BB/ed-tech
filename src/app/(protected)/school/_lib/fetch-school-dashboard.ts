import {
  pickLatestActivityIso,
  riskFromSignals,
  schoolDashboardAttentionIssue,
} from "@/lib/school-student-risk";
import {
  getStudentApplicationProfileCompletion,
  studentApplicationProfileRowToCompletionInput,
  type StudentApplicationProfileCompletionRow,
} from "@/lib/student-application-profile-completion";
import { createSupabaseServerClient } from "@/utils/supabase-server";

import { parseSchoolDashboardShortlistTopStats } from "./parse-shortlist-top-stats";

const PAGE_SIZE = 1000;
const DASHBOARD_SHORTLIST_TOP_N = 6;

export type SchoolDashboardAttentionRow = {
  id: string;
  firstName: string;
  lastName: string;
  grade: string | null;
  initials: string;
  riskClass: "red" | "amber";
  riskLabel: string;
  issue: string;
};

export type SchoolDashboardPayload = {
  totalStudents: number;
  activeStudents30d: number;
  advisorSessionsCount: number;
  ambassadorSessionsCount: number;
  studentsUsingAppSupportCount: number;
  universitiesShortlistedCount: number;
  attention: SchoolDashboardAttentionRow[];
  topDestinations: { label: string; count: number }[];
  topPrograms: { label: string; count: number }[];
};

function initialsFromStudent(first: string, last: string): string {
  const a = first.trim()[0];
  const b = last.trim()[0];
  const pair = `${a ?? ""}${b ?? ""}`.toUpperCase();
  if (pair) return pair.slice(0, 2);
  if (a) return a.toUpperCase();
  return "?";
}

function mergeMaxTime(
  map: Map<string, number>,
  studentId: string | null,
  iso: string | null,
) {
  if (!studentId || !iso) return;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return;
  const prev = map.get(studentId);
  if (prev === undefined || t > prev) map.set(studentId, t);
}

async function scanActivities(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  cutoff30Iso: string,
): Promise<{ maxByStudent: Map<string, number>; active30: Set<string> }> {
  const maxByStudent = new Map<string, number>();
  const active30 = new Set<string>();
  const cutoff30Ms = new Date(cutoff30Iso).getTime();
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("student_activities")
      .select("student_id, created_at")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error(
        "[fetchSchoolDashboard] student_activities:",
        error.message,
      );
      break;
    }
    if (!data?.length) break;
    for (const row of data) {
      mergeMaxTime(maxByStudent, row.student_id, row.created_at);
      if (
        row.student_id &&
        row.created_at &&
        new Date(row.created_at).getTime() >= cutoff30Ms
      ) {
        active30.add(row.student_id);
      }
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return { maxByStudent, active30 };
}

async function scanAiUsage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  cutoff30Iso: string,
): Promise<{ maxByStudent: Map<string, number>; active30: Set<string> }> {
  const maxByStudent = new Map<string, number>();
  const active30 = new Set<string>();
  const cutoff30Ms = new Date(cutoff30Iso).getTime();
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("ai_usage")
      .select("student_id, created_at")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("[fetchSchoolDashboard] ai_usage:", error.message);
      break;
    }
    if (!data?.length) break;
    for (const row of data) {
      mergeMaxTime(maxByStudent, row.student_id, row.created_at);
      if (
        row.student_id &&
        row.created_at &&
        new Date(row.created_at).getTime() >= cutoff30Ms
      ) {
        active30.add(row.student_id);
      }
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return { maxByStudent, active30 };
}

async function paginateStudentIds(
  fetchPage: (
    from: number,
    to: number,
  ) => Promise<{
    data: { student_id: string }[] | null;
    error: { message: string } | null;
  }>,
): Promise<Set<string>> {
  const set = new Set<string>();
  let from = 0;
  for (;;) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error(
        "[fetchSchoolDashboard] paginateStudentIds:",
        error.message,
      );
      break;
    }
    if (!data?.length) break;
    for (const row of data) {
      if (row.student_id) set.add(row.student_id);
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return set;
}

type AppProfRow = StudentApplicationProfileCompletionRow & {
  student_id: string;
};

function toCompletionRow(
  row: AppProfRow,
): StudentApplicationProfileCompletionRow {
  const {
    student_id: _sid,
    grade,
    curriculum,
    preferred_destinations,
    interested_programs,
    english_test_scores,
    sat_act_scores,
  } = row;
  return {
    grade,
    curriculum,
    preferred_destinations,
    interested_programs,
    english_test_scores,
    sat_act_scores,
  };
}

async function fetchApplicationProfilesForSchool(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  schoolId: string,
): Promise<Map<string, AppProfRow>> {
  const byStudent = new Map<string, AppProfRow>();
  const { data: profileRows, error: profErr } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("school_id", schoolId);

  if (profErr) {
    console.error(
      "[fetchSchoolDashboard] student_profiles ids:",
      profErr.message,
    );
    return byStudent;
  }

  const ids = (profileRows ?? []).map((r) => r.id).filter(Boolean);
  const chunkSize = 200;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("student_application_profile")
      .select(
        "student_id, grade, curriculum, preferred_destinations, interested_programs, english_test_scores, sat_act_scores",
      )
      .in("student_id", chunk);
    if (error) {
      console.error(
        "[fetchSchoolDashboard] student_application_profile:",
        error.message,
      );
      continue;
    }
    for (const row of data ?? []) {
      byStudent.set(row.student_id, row);
    }
  }
  return byStudent;
}

export async function fetchSchoolDashboard(): Promise<SchoolDashboardPayload> {
  const empty: SchoolDashboardPayload = {
    totalStudents: 0,
    activeStudents30d: 0,
    advisorSessionsCount: 0,
    ambassadorSessionsCount: 0,
    studentsUsingAppSupportCount: 0,
    universitiesShortlistedCount: 0,
    attention: [],
    topDestinations: [],
    topPrograms: [],
  };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) return empty;

  const { data: sap } = await supabase
    .from("school_admin_profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  const schoolId = sap?.school_id;
  if (!schoolId) return empty;

  const cutoff30 = new Date();
  cutoff30.setDate(cutoff30.getDate() - 30);
  const cutoff30Iso = cutoff30.toISOString();

  const [
    totalStudentsRes,
    advisorCountRes,
    ambassadorCountRes,
    shortlistTopStatsRes,
    profilesRes,
  ] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId),
    supabase
      .from("advisor_sessions")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("ambassador_session_requests")
      .select("*", { count: "exact", head: true }),
    supabase.rpc("school_dashboard_shortlist_top_stats", {
      p_top_n: DASHBOARD_SHORTLIST_TOP_N,
    }),
    supabase
      .from("student_profiles")
      .select("id, first_name, last_name, grade, updated_at, created_at")
      .eq("school_id", schoolId),
  ]);

  if (totalStudentsRes.error) {
    console.error(
      "[fetchSchoolDashboard] totalStudents:",
      totalStudentsRes.error.message,
    );
  }
  const totalStudents = totalStudentsRes.count ?? 0;
  const advisorSessionsCount = advisorCountRes.error
    ? 0
    : (advisorCountRes.count ?? 0);
  const ambassadorSessionsCount = ambassadorCountRes.error
    ? 0
    : (ambassadorCountRes.count ?? 0);

  if (shortlistTopStatsRes.error) {
    console.error(
      "[fetchSchoolDashboard] school_dashboard_shortlist_top_stats:",
      shortlistTopStatsRes.error.message,
    );
  }
  const shortlistTopStats = parseSchoolDashboardShortlistTopStats(
    shortlistTopStatsRes.data,
  );
  const universitiesShortlistedCount = shortlistTopStats.shortlistRowCount;

  if (profilesRes.error || !profilesRes.data) {
    console.error(
      "[fetchSchoolDashboard] profiles:",
      profilesRes.error?.message,
    );
    return {
      ...empty,
      totalStudents,
      advisorSessionsCount,
      ambassadorSessionsCount,
      universitiesShortlistedCount,
      topDestinations: shortlistTopStats.topDestinations,
      topPrograms: shortlistTopStats.topPrograms,
    };
  }

  const profiles = profilesRes.data;

  const [
    actScan,
    aiScan,
    supportAdvisorIds,
    supportAmbassadorIds,
    supportEssayIds,
    appProfByStudent,
  ] = await Promise.all([
    scanActivities(supabase, cutoff30Iso),
    scanAiUsage(supabase, cutoff30Iso),
    paginateStudentIds(async (from, to) =>
      supabase.from("advisor_sessions").select("student_id").range(from, to),
    ),
    paginateStudentIds(async (from, to) =>
      supabase
        .from("ambassador_session_requests")
        .select("student_id")
        .range(from, to),
    ),
    paginateStudentIds(async (from, to) =>
      supabase
        .from("ai_usage")
        .select("student_id")
        .eq("type", "essay_review")
        .range(from, to),
    ),
    fetchApplicationProfilesForSchool(supabase, schoolId),
  ]);

  const profileIds30dUpdated = new Set(
    profiles
      .filter(
        (p) => p.updated_at && new Date(p.updated_at) >= new Date(cutoff30Iso),
      )
      .map((p) => p.id),
  );

  const activeStudents30d = new Set<string>();
  for (const id of actScan.active30) activeStudents30d.add(id);
  for (const id of aiScan.active30) activeStudents30d.add(id);
  for (const id of profileIds30dUpdated) activeStudents30d.add(id);

  const studentsUsingAppSupport = new Set<string>();
  for (const id of supportAdvisorIds) studentsUsingAppSupport.add(id);
  for (const id of supportAmbassadorIds) studentsUsingAppSupport.add(id);
  for (const id of supportEssayIds) studentsUsingAppSupport.add(id);

  const attentionRaw: SchoolDashboardAttentionRow[] = [];

  for (const p of profiles) {
    const appRow = appProfByStudent.get(p.id);
    const profilePct = getStudentApplicationProfileCompletion(
      studentApplicationProfileRowToCompletionInput(
        appRow ? toCompletionRow(appRow) : null,
      ),
    ).pct;

    const actMs = actScan.maxByStudent.get(p.id);
    const aiMs = aiScan.maxByStudent.get(p.id);
    const platformAt = pickLatestActivityIso(
      actMs !== undefined ? new Date(actMs).toISOString() : null,
      aiMs !== undefined ? new Date(aiMs).toISOString() : null,
    );

    const activityIso = platformAt ?? p.updated_at ?? p.created_at ?? null;

    let inactiveWeek = false;
    if (activityIso) {
      try {
        const t = new Date(activityIso).getTime();
        if (!Number.isNaN(t)) {
          inactiveWeek = (Date.now() - t) / (1000 * 60 * 60 * 24) >= 7;
        }
      } catch {
        inactiveWeek = false;
      }
    }

    const { riskClass, riskLabel } = riskFromSignals(profilePct, inactiveWeek);
    if (riskClass === "green") continue;

    attentionRaw.push({
      id: p.id,
      firstName: p.first_name?.trim() ?? "",
      lastName: p.last_name?.trim() ?? "",
      grade: p.grade?.trim() ?? null,
      initials: initialsFromStudent(
        p.first_name?.trim() ?? "",
        p.last_name?.trim() ?? "",
      ),
      riskClass,
      riskLabel,
      issue: schoolDashboardAttentionIssue(profilePct, inactiveWeek),
    });
  }

  attentionRaw.sort((a, b) => {
    if (a.riskClass !== b.riskClass) return a.riskClass === "red" ? -1 : 1;
    return `${a.lastName} ${a.firstName}`.localeCompare(
      `${b.lastName} ${b.firstName}`,
    );
  });

  return {
    totalStudents,
    activeStudents30d: activeStudents30d.size,
    advisorSessionsCount,
    ambassadorSessionsCount,
    studentsUsingAppSupportCount: studentsUsingAppSupport.size,
    universitiesShortlistedCount,
    attention: attentionRaw.slice(0, 5),
    topDestinations: shortlistTopStats.topDestinations,
    topPrograms: shortlistTopStats.topPrograms,
  };
}
