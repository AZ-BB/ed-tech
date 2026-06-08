import { applyStudentTeacherFilter } from "@/lib/fetch-school-teacher-options";
import { parseSchoolStudentsNeedingFollowUp } from "@/lib/school-student-risk";
import type { StudentTeacherFilterValue } from "@/lib/student-teacher-assignment";
import { fetchStudentAvatarUrlMap } from "@/lib/student-avatar-url-map";
import { createSupabaseServerClient } from "@/utils/supabase-server";

import { countSchoolActiveStudentsMonth } from "./school-active-students-month";
import { fetchSchoolShortlistStats } from "./fetch-school-shortlisted-universities";
import { parseSchoolDashboardShortlistTopStats } from "./parse-shortlist-top-stats";

const PAGE_SIZE = 1000;
const DASHBOARD_SHORTLIST_TOP_N = 6;
const DASHBOARD_FOLLOW_UP_LIMIT = 5;
const DASHBOARD_OFFER_HIGHLIGHTS_LIMIT = 8;

export type SchoolDashboardOfferHighlight = {
  shortlistId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  grade: string;
  avatarUrl: string | null;
  universityName: string;
  country: string | null;
  program: string | null;
  updatedAt: string;
};

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
  offerHighlights: SchoolDashboardOfferHighlight[];
  topDestinations: { label: string; count: number }[];
  topPopularUniversities: { label: string; count: number }[];
};

type OfferHighlightQueryRow = {
  id: string;
  student_id: string;
  university_name: string;
  country: string | null;
  major_program: string | null;
  updated_at: string;
  student_profiles: {
    first_name: string | null;
    last_name: string | null;
    grade: string | null;
    avatar_url: string | null;
    school_id: string;
  };
};

async function fetchSchoolOfferHighlights(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  schoolId: string,
  teacherFilter: StudentTeacherFilterValue,
): Promise<SchoolDashboardOfferHighlight[]> {
  let q = supabase
    .from("student_shortlist_universities")
    .select(
      `
      id,
      student_id,
      university_name,
      country,
      major_program,
      updated_at,
      student_profiles!inner (
        first_name,
        last_name,
        grade,
        avatar_url,
        school_id,
        teacher_id
      )
    `,
    )
    .eq("student_profiles.school_id", schoolId)
    .eq("decision", "offer_received");

  if (teacherFilter) {
    q = q.eq("student_profiles.teacher_id", teacherFilter);
  }

  const { data, error } = await q
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(DASHBOARD_OFFER_HIGHLIGHTS_LIMIT);

  if (error) {
    console.error("[fetchSchoolOfferHighlights]", error.message);
    return [];
  }

  return (data ?? []).map((raw) => {
    const row = raw as unknown as OfferHighlightQueryRow;
    const sp = row.student_profiles;
    return {
      shortlistId: row.id,
      studentId: row.student_id,
      firstName: sp?.first_name?.trim() ?? "",
      lastName: sp?.last_name?.trim() ?? "",
      grade: sp?.grade?.trim() ?? "",
      avatarUrl: sp?.avatar_url?.trim() || null,
      universityName: row.university_name?.trim() || "—",
      country: row.country?.trim() || null,
      program: row.major_program?.trim() || null,
      updatedAt: row.updated_at,
    };
  });
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

export async function fetchSchoolDashboard(options?: {
  teacherFilter?: StudentTeacherFilterValue;
}): Promise<SchoolDashboardPayload> {
  const teacherFilter = options?.teacherFilter ?? "";
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
    offerHighlights: [],
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

  const teacherRpcId = teacherFilter || null;

  const [
    totalStudentsRes,
    inviteCountRes,
    schoolLimitRes,
    advisorCountRes,
    shortlistTopStatsRes,
    profilesRes,
    followUpRes,
    offerHighlights,
  ] = await Promise.all([
    applyStudentTeacherFilter(
      supabase
        .from("student_profiles")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId),
      teacherFilter,
    ),
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
      p_teacher_id: teacherRpcId,
    }),
    applyStudentTeacherFilter(
      supabase
        .from("student_profiles")
        .select("id, first_name, last_name, grade, updated_at, created_at")
        .eq("school_id", schoolId),
      teacherFilter,
    ),
    supabase.rpc("school_students_needing_follow_up", {
      p_limit: DASHBOARD_FOLLOW_UP_LIMIT,
      p_school_id: schoolId,
      p_teacher_id: teacherRpcId,
    }),
    fetchSchoolOfferHighlights(supabase, schoolId, teacherFilter),
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
      offerHighlights,
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
  for (const id of supportAdvisorIds) {
    if (schoolStudentSet.has(id)) studentsUsingAppSupport.add(id);
  }
  for (const id of supportAmbassadorIds) {
    if (schoolStudentSet.has(id)) studentsUsingAppSupport.add(id);
  }
  for (const id of supportEssayIds) {
    if (schoolStudentSet.has(id)) studentsUsingAppSupport.add(id);
  }

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
    offerHighlights,
    topDestinations: shortlistTopStats.topDestinations,
    topPopularUniversities,
  };
}
