import { parseSchoolStudentsNeedingFollowUp } from "@/lib/school-student-risk";
import { fetchStudentAvatarUrlMap } from "@/lib/student-avatar-url-map";
import { createSupabaseServerClient } from "@/utils/supabase-server";

import { countSchoolActiveStudentsMonth } from "./school-active-students-month";
import { fetchSchoolShortlistStats } from "./fetch-school-shortlisted-universities";
import { parseSchoolDashboardShortlistTopStats } from "./parse-shortlist-top-stats";

const PAGE_SIZE = 1000;
const DASHBOARD_SHORTLIST_TOP_N = 6;
const DASHBOARD_FOLLOW_UP_LIMIT = 5;

export type SchoolDashboardAttentionRow = {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  avatarUrl: string | null;
  riskClass: "red" | "amber";
  riskLabel: string;
  issue: string;
};

export type SchoolDashboardShortlistedUniversity = {
  id: string;
  name: string;
  country: string | null;
};

export type SchoolDashboardPayload = {
  totalStudents: number;
  seatsAvailable: number | null;
  signedUpCount: number;
  pendingInvitesCount: number;
  studentsLimit: number | null;
  activeStudentsMonth: number;
  advisorSessionsCount: number;
  studentsUsingAppSupportCount: number;
  universitiesShortlistedCount: number;
  shortlistedUniversities: SchoolDashboardShortlistedUniversity[];
  attention: SchoolDashboardAttentionRow[];
  topDestinations: { label: string; count: number }[];
  topPopularUniversities: { label: string; count: number }[];
};

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

export async function fetchSchoolDashboard(): Promise<SchoolDashboardPayload> {
  const empty: SchoolDashboardPayload = {
    totalStudents: 0,
    seatsAvailable: null,
    signedUpCount: 0,
    pendingInvitesCount: 0,
    studentsLimit: null,
    activeStudentsMonth: 0,
    advisorSessionsCount: 0,
    studentsUsingAppSupportCount: 0,
    universitiesShortlistedCount: 0,
    shortlistedUniversities: [],
    attention: [],
    topDestinations: [],
    topPopularUniversities: [],
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

  const [
    totalStudentsRes,
    inviteCountRes,
    schoolLimitRes,
    advisorCountRes,
    shortlistTopStatsRes,
    profilesRes,
    followUpRes,
  ] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId),
    supabase
      .from("school_students")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("signed_up", false),
    supabase
      .from("schools")
      .select("students_limit")
      .eq("id", schoolId)
      .maybeSingle(),
    supabase
      .from("advisor_sessions")
      .select("*", { count: "exact", head: true }),
    supabase.rpc("school_dashboard_shortlist_top_stats", {
      p_top_n: DASHBOARD_SHORTLIST_TOP_N,
    }),
    supabase
      .from("student_profiles")
      .select("id, first_name, last_name, grade, updated_at, created_at")
      .eq("school_id", schoolId),
    supabase.rpc("school_students_needing_follow_up", {
      p_limit: DASHBOARD_FOLLOW_UP_LIMIT,
      p_school_id: schoolId,
    }),
  ]);

  if (totalStudentsRes.error) {
    console.error(
      "[fetchSchoolDashboard] totalStudents:",
      totalStudentsRes.error.message,
    );
  }

  const signedUpCount = totalStudentsRes.count ?? 0;
  const totalStudents = signedUpCount;
  const pendingInvitesCount = inviteCountRes.error
    ? 0
    : (inviteCountRes.count ?? 0);
  const studentsLimit = schoolLimitRes.data?.students_limit ?? null;
  const seatsAvailable =
    studentsLimit != null
      ? Math.max(0, studentsLimit - signedUpCount - pendingInvitesCount)
      : null;

  const advisorSessionsCount = advisorCountRes.error
    ? 0
    : (advisorCountRes.count ?? 0);

  if (shortlistTopStatsRes.error) {
    console.error(
      "[fetchSchoolDashboard] school_dashboard_shortlist_top_stats:",
      shortlistTopStatsRes.error.message,
    );
  }
  const shortlistTopStats = parseSchoolDashboardShortlistTopStats(
    shortlistTopStatsRes.data,
  );

  const followUp = parseSchoolStudentsNeedingFollowUp(followUpRes.data);
  if (followUpRes.error) {
    console.error(
      "[fetchSchoolDashboard] school_students_needing_follow_up:",
      followUpRes.error.message,
    );
  } else if (
    followUp.need_attention_count > 0 &&
    followUp.students.length === 0
  ) {
    console.error(
      "[fetchSchoolDashboard] school_students_needing_follow_up: count > 0 but students array empty",
      followUpRes.data,
    );
  }
  const avatarByStudent = await fetchStudentAvatarUrlMap(
    supabase,
    followUp.students.map((s) => s.id),
  );
  const attention: SchoolDashboardAttentionRow[] = followUp.students.map(
    (s) => ({
      id: s.id,
      firstName: s.first_name.trim(),
      lastName: s.last_name.trim(),
      grade: s.grade,
      avatarUrl: avatarByStudent.get(s.id) ?? null,
      riskClass: s.risk_class,
      riskLabel: s.risk_label,
      issue: s.issue,
    }),
  );

  if (profilesRes.error || !profilesRes.data) {
    console.error(
      "[fetchSchoolDashboard] profiles:",
      profilesRes.error?.message,
    );
    return {
      ...empty,
      totalStudents,
      seatsAvailable,
      signedUpCount,
      pendingInvitesCount,
      studentsLimit,
      advisorSessionsCount,
      attention,
      topDestinations: shortlistTopStats.topDestinations,
      topPopularUniversities: [],
    };
  }

  const profiles = profilesRes.data;
  const schoolStudentIds = profiles.map((p) => p.id);
  const schoolStudentSet = new Set(schoolStudentIds);

  const [
    supportAdvisorIds,
    supportAmbassadorIds,
    supportEssayIds,
    activeStudentsMonth,
    shortlistStats,
  ] = await Promise.all([
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
    countSchoolActiveStudentsMonth(supabase, schoolStudentSet, profiles),
    fetchSchoolShortlistStats(
      supabase,
      schoolStudentIds,
      DASHBOARD_SHORTLIST_TOP_N,
    ),
  ]);

  const { shortlistedUniversities, topPopularUniversities } = shortlistStats;

  const studentsUsingAppSupport = new Set<string>();
  for (const id of supportAdvisorIds) studentsUsingAppSupport.add(id);
  for (const id of supportAmbassadorIds) studentsUsingAppSupport.add(id);
  for (const id of supportEssayIds) studentsUsingAppSupport.add(id);

  return {
    totalStudents,
    seatsAvailable,
    signedUpCount,
    pendingInvitesCount,
    studentsLimit,
    activeStudentsMonth,
    advisorSessionsCount,
    studentsUsingAppSupportCount: studentsUsingAppSupport.size,
    universitiesShortlistedCount: shortlistedUniversities.length,
    shortlistedUniversities,
    attention,
    topDestinations: shortlistTopStats.topDestinations,
    topPopularUniversities,
  };
}
