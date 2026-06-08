import type { Database } from "@/database.types";
import { applyStudentTeacherFilter } from "@/lib/fetch-school-teacher-options";
import { parseSchoolStudentsNeedingFollowUp } from "@/lib/school-student-risk";
import type { StudentTeacherFilterValue } from "@/lib/student-teacher-assignment";
import { fetchStudentAvatarUrlMap } from "@/lib/student-avatar-url-map";
import {
  getStudentApplicationProfileCompletion,
  studentApplicationProfileRowToCompletionInput,
  type StudentApplicationProfileCompletionRow,
} from "@/lib/student-application-profile-completion";
import { createSupabaseServerClient } from "@/utils/supabase-server";

import { parseSchoolDashboardShortlistTopStats } from "../../_lib/parse-shortlist-top-stats";

type SupabaseServer = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const PAGE_SIZE = 1000;
const REPORTS_SHORTLIST_TOP_N = 6;
const STUDENT_CHUNK = 150;

export type SchoolReportsAttentionRow = {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  avatarUrl: string | null;
  riskClass: "red" | "amber";
  riskLabel: string;
  issue: string;
};

export type SchoolReportsOutcomeRow = {
  studentId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  destinationsSummary: string;
  programsSummary: string;
  applicationsSubmitted: number;
  applicationsTotal: number;
  profilePercent: number;
};

export type SchoolReportsPayload = {
  schoolName: string;
  monthLabel: string;
  monthKey: string;
  monthStartIso: string;
  monthEndExclusiveIso: string;
  totalStudents: number;
  activeStudentsMonth: number;
  needAttentionCount: number;
  appsSubmittedMonth: number;
  topDestinations: { label: string; count: number }[];
  topPrograms: { label: string; count: number }[];
  advisorSessionsMonth: number;
  ambassadorSessionsMonth: number;
  essayReviewsMonth: number;
  webinarsMonth: number;
  universitiesShortlistedMonth: number;
  attentionStudents: SchoolReportsAttentionRow[];
  outcomes: SchoolReportsOutcomeRow[];
};

function utcMonthBounds(reference = new Date()): {
  monthStartIso: string;
  monthEndExclusiveIso: string;
  monthLabel: string;
  monthKey: string;
} {
  const y = reference.getUTCFullYear();
  const m = reference.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  const endExclusive = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0));
  const monthLabel = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(start);
  const monthKey = `${y}-${String(m + 1).padStart(2, "0")}`;
  return {
    monthStartIso: start.toISOString(),
    monthEndExclusiveIso: endExclusive.toISOString(),
    monthLabel,
    monthKey,
  };
}

async function collectStudentIdsActiveFromActivities(
  supabase: SupabaseServer,
  monthStartIso: string,
  monthEndExclusiveIso: string,
  schoolStudentSet: Set<string>,
): Promise<Set<string>> {
  const active = new Set<string>();
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("student_activities")
      .select("student_id")
      .gte("created_at", monthStartIso)
      .lt("created_at", monthEndExclusiveIso)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error(
        "[fetchSchoolReports] student_activities range:",
        error.message,
      );
      break;
    }
    if (!data?.length) break;
    for (const row of data) {
      if (row.student_id && schoolStudentSet.has(row.student_id)) {
        active.add(row.student_id);
      }
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return active;
}

async function collectStudentIdsActiveFromAiUsage(
  supabase: SupabaseServer,
  monthStartIso: string,
  monthEndExclusiveIso: string,
  schoolStudentSet: Set<string>,
): Promise<Set<string>> {
  const active = new Set<string>();
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("ai_usage")
      .select("student_id")
      .gte("created_at", monthStartIso)
      .lt("created_at", monthEndExclusiveIso)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("[fetchSchoolReports] ai_usage range:", error.message);
      break;
    }
    if (!data?.length) break;
    for (const row of data) {
      if (row.student_id && schoolStudentSet.has(row.student_id)) {
        active.add(row.student_id);
      }
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return active;
}

async function countAdvisorSessionsMonth(
  supabase: SupabaseServer,
  schoolStudentIds: string[],
  monthStartIso: string,
  monthEndExclusiveIso: string,
): Promise<number> {
  let total = 0;
  for (let i = 0; i < schoolStudentIds.length; i += STUDENT_CHUNK) {
    const chunk = schoolStudentIds.slice(i, i + STUDENT_CHUNK);
    const { count, error } = await supabase
      .from("advisor_sessions")
      .select("*", { count: "exact", head: true })
      .in("student_id", chunk)
      .gte("created_at", monthStartIso)
      .lt("created_at", monthEndExclusiveIso);
    if (error) {
      console.error("[fetchSchoolReports] advisor_sessions:", error.message);
      continue;
    }
    total += count ?? 0;
  }
  return total;
}

async function countAmbassadorSessionsMonth(
  supabase: SupabaseServer,
  schoolStudentIds: string[],
  monthStartIso: string,
  monthEndExclusiveIso: string,
): Promise<number> {
  let total = 0;
  for (let i = 0; i < schoolStudentIds.length; i += STUDENT_CHUNK) {
    const chunk = schoolStudentIds.slice(i, i + STUDENT_CHUNK);
    const { count, error } = await supabase
      .from("ambassador_session_requests")
      .select("*", { count: "exact", head: true })
      .in("student_id", chunk)
      .gte("created_at", monthStartIso)
      .lt("created_at", monthEndExclusiveIso);
    if (error) {
      console.error(
        "[fetchSchoolReports] ambassador_session_requests:",
        error.message,
      );
      continue;
    }
    total += count ?? 0;
  }
  return total;
}

async function countEssayReviewsMonth(
  supabase: SupabaseServer,
  schoolStudentIds: string[],
  monthStartIso: string,
  monthEndExclusiveIso: string,
): Promise<number> {
  let total = 0;
  for (let i = 0; i < schoolStudentIds.length; i += STUDENT_CHUNK) {
    const chunk = schoolStudentIds.slice(i, i + STUDENT_CHUNK);
    const { count, error } = await supabase
      .from("ai_usage")
      .select("*", { count: "exact", head: true })
      .eq("type", "essay_review")
      .in("student_id", chunk)
      .gte("created_at", monthStartIso)
      .lt("created_at", monthEndExclusiveIso);
    if (error) {
      console.error(
        "[fetchSchoolReports] ai_usage essay_review:",
        error.message,
      );
      continue;
    }
    total += count ?? 0;
  }
  return total;
}

async function countShortlistUniversitiesMonthFixed(
  supabase: SupabaseServer,
  schoolStudentSet: Set<string>,
  monthStartIso: string,
  monthEndExclusiveIso: string,
): Promise<number> {
  let total = 0;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("student_activities")
      .select("student_id")
      .eq("type", "shortlist")
      .eq("entity_type", "university")
      .gte("created_at", monthStartIso)
      .lt("created_at", monthEndExclusiveIso)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error(
        "[fetchSchoolReports] shortlist activities:",
        error.message,
      );
      break;
    }
    if (!data?.length) break;
    for (const row of data) {
      if (row.student_id && schoolStudentSet.has(row.student_id)) total += 1;
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return total;
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
    ielts_score,
    toefl_score,
    sat_score,
    act_score,
    sat_act_scores,
  } = row;
  return {
    grade,
    curriculum,
    preferred_destinations,
    interested_programs,
    english_test_scores,
    ielts_score,
    toefl_score,
    sat_score,
    act_score,
    sat_act_scores,
  };
}

async function fetchApplicationProfilesForSchool(
  supabase: SupabaseServer,
  schoolId: string,
): Promise<Map<string, AppProfRow>> {
  const byStudent = new Map<string, AppProfRow>();
  const { data: profileRows, error: profErr } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("school_id", schoolId);

  if (profErr) {
    console.error(
      "[fetchSchoolReports] student_profiles ids:",
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
        "student_id, grade, curriculum, preferred_destinations, interested_programs, english_test_scores, ielts_score, toefl_score, sat_score, act_score, sat_act_scores",
      )
      .in("student_id", chunk);
    if (error) {
      console.error(
        "[fetchSchoolReports] student_application_profile:",
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

function rollupShortlist(
  rows: {
    student_id: string;
    country: string | null;
    major_program: string | null;
    sort_order: number;
  }[],
): Map<string, { destinationsSummary: string; programsSummary: string }> {
  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);

  type Acc = {
    countries: string[];
    countrySeen: Set<string>;
    programs: string[];
  };
  const map = new Map<string, Acc>();

  for (const r of sorted) {
    let acc = map.get(r.student_id);
    if (!acc) {
      acc = { countries: [], countrySeen: new Set(), programs: [] };
      map.set(r.student_id, acc);
    }
    const c = r.country?.trim();
    if (c && acc.countries.length < 3) {
      const key = c.toLowerCase();
      if (!acc.countrySeen.has(key)) {
        acc.countrySeen.add(key);
        acc.countries.push(c);
      }
    }
    const p = r.major_program?.trim();
    if (p && acc.programs.length < 3) acc.programs.push(p);
  }

  const summaries = new Map<
    string,
    { destinationsSummary: string; programsSummary: string }
  >();
  for (const [sid, acc] of map) {
    summaries.set(sid, {
      destinationsSummary: acc.countries.length
        ? acc.countries.join(", ")
        : "—",
      programsSummary: acc.programs.length ? acc.programs.join(", ") : "—",
    });
  }
  return summaries;
}

export async function fetchSchoolReports(options?: {
  teacherFilter?: StudentTeacherFilterValue;
}): Promise<SchoolReportsPayload | null> {
  const teacherFilter = options?.teacherFilter ?? "";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return null;

  const { data: sap } = await supabase
    .from("school_admin_profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  const schoolId = sap?.school_id;
  if (!schoolId) return null;

  const { monthStartIso, monthEndExclusiveIso, monthLabel, monthKey } =
    utcMonthBounds();

  let schoolName = "";
  const { data: schoolRow } = await supabase
    .from("schools")
    .select("name")
    .eq("id", schoolId)
    .maybeSingle();
  schoolName = schoolRow?.name?.trim() || "School";

  const teacherRpcId = teacherFilter || null;

  const [totalStudentsRes, shortlistRpcRes, profilesRes] = await Promise.all([
    applyStudentTeacherFilter(
      supabase
        .from("student_profiles")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId),
      teacherFilter,
    ),
    supabase.rpc("school_dashboard_shortlist_top_stats", {
      p_top_n: REPORTS_SHORTLIST_TOP_N,
      p_teacher_id: teacherRpcId,
    }),
    applyStudentTeacherFilter(
      supabase
        .from("student_profiles")
        .select(
          "id, first_name, last_name, avatar_url, grade, updated_at, created_at",
        )
        .eq("school_id", schoolId)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true }),
      teacherFilter,
    ),
  ]);

  if (shortlistRpcRes.error) {
    console.error(
      "[fetchSchoolReports] school_dashboard_shortlist_top_stats:",
      shortlistRpcRes.error.message,
    );
  }
  const shortlistTopStats = parseSchoolDashboardShortlistTopStats(
    shortlistRpcRes.data,
  );

  const profiles = profilesRes.data ?? [];
  if (profilesRes.error) {
    console.error("[fetchSchoolReports] profiles:", profilesRes.error.message);
  }
  const schoolStudentIds = profiles.map((p) => p.id);
  const schoolStudentSet = new Set(schoolStudentIds);

  let appsSubmittedRes: { count: number | null; error: { message: string } | null };
  if (teacherFilter && schoolStudentIds.length === 0) {
    appsSubmittedRes = { count: 0, error: null };
  } else {
    let appsQuery = supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq(
        "status",
        "submitted" satisfies Database["public"]["Enums"]["application_status"],
      )
      .gte("submitted_at", monthStartIso)
      .lt("submitted_at", monthEndExclusiveIso);
    if (teacherFilter && schoolStudentIds.length > 0) {
      appsQuery = appsQuery.in("student_id", schoolStudentIds);
    }
    const res = await appsQuery;
    appsSubmittedRes = { count: res.count, error: res.error };
  }

  const activeMonth = new Set<string>();
  const actReal = await collectStudentIdsActiveFromActivities(
    supabase,
    monthStartIso,
    monthEndExclusiveIso,
    schoolStudentSet,
  );
  const aiReal = await collectStudentIdsActiveFromAiUsage(
    supabase,
    monthStartIso,
    monthEndExclusiveIso,
    schoolStudentSet,
  );
  for (const id of actReal) activeMonth.add(id);
  for (const id of aiReal) activeMonth.add(id);
  for (const p of profiles) {
    if (!p.updated_at) continue;
    const t = new Date(p.updated_at).getTime();
    const start = new Date(monthStartIso).getTime();
    const end = new Date(monthEndExclusiveIso).getTime();
    if (t >= start && t < end) activeMonth.add(p.id);
  }

  const [
    advisorSessionsMonth,
    ambassadorSessionsMonth,
    essayReviewsMonth,
    universitiesShortlistedMonth,
    appProfByStudent,
    followUpRes,
    shortlistRowsRes,
    appsByStudentRes,
  ] = await Promise.all([
    countAdvisorSessionsMonth(
      supabase,
      schoolStudentIds,
      monthStartIso,
      monthEndExclusiveIso,
    ),
    countAmbassadorSessionsMonth(
      supabase,
      schoolStudentIds,
      monthStartIso,
      monthEndExclusiveIso,
    ),
    countEssayReviewsMonth(
      supabase,
      schoolStudentIds,
      monthStartIso,
      monthEndExclusiveIso,
    ),
    countShortlistUniversitiesMonthFixed(
      supabase,
      schoolStudentSet,
      monthStartIso,
      monthEndExclusiveIso,
    ),
    fetchApplicationProfilesForSchool(supabase, schoolId),
    supabase.rpc("school_students_needing_follow_up", {
      p_limit: 0,
      p_school_id: schoolId,
      p_teacher_id: teacherRpcId,
    }),
    schoolStudentIds.length
      ? supabase
          .from("student_shortlist_universities")
          .select("student_id, country, major_program, sort_order")
          .in("student_id", schoolStudentIds)
      : Promise.resolve({ data: [] as const, error: null }),
    supabase
      .from("applications")
      .select("student_id, status")
      .eq("school_id", schoolId),
  ]);

  const shortlistRollup = rollupShortlist(
    (shortlistRowsRes.data ?? []) as {
      student_id: string;
      country: string | null;
      major_program: string | null;
      sort_order: number;
    }[],
  );

  const appCountsByStudent = new Map<
    string,
    { total: number; submitted: number }
  >();
  if (!appsByStudentRes.error && appsByStudentRes.data) {
    for (const row of appsByStudentRes.data) {
      const sid = row.student_id;
      if (!schoolStudentSet.has(sid)) continue;
      let cur = appCountsByStudent.get(sid);
      if (!cur) {
        cur = { total: 0, submitted: 0 };
        appCountsByStudent.set(sid, cur);
      }
      cur.total += 1;
      if (row.status === "submitted") cur.submitted += 1;
    }
  } else if (appsByStudentRes.error) {
    console.error(
      "[fetchSchoolReports] applications:",
      appsByStudentRes.error.message,
    );
  }

  if (followUpRes.error) {
    console.error(
      "[fetchSchoolReports] school_students_needing_follow_up:",
      followUpRes.error.message,
    );
  }
  const followUp = parseSchoolStudentsNeedingFollowUp(followUpRes.data);
  const needAttentionCount = followUp.need_attention_count;
  const attentionAvatarMap = await fetchStudentAvatarUrlMap(
    supabase,
    followUp.students.map((s) => s.id),
  );
  const attentionStudents: SchoolReportsAttentionRow[] = followUp.students.map(
    (s) => ({
      id: s.id,
      firstName: s.first_name.trim(),
      lastName: s.last_name.trim(),
      grade: s.grade,
      avatarUrl: attentionAvatarMap.get(s.id) ?? null,
      riskClass: s.risk_class,
      riskLabel: s.risk_label,
      issue: s.issue,
    }),
  );

  const outcomes: SchoolReportsOutcomeRow[] = profiles.map((p) => {
    const sl = shortlistRollup.get(p.id);
    const counts = appCountsByStudent.get(p.id) ?? { total: 0, submitted: 0 };
    const appRow = appProfByStudent.get(p.id);
    const profilePct = getStudentApplicationProfileCompletion(
      studentApplicationProfileRowToCompletionInput(
        appRow ? toCompletionRow(appRow) : null,
      ),
    ).pct;

    return {
      studentId: p.id,
      firstName: p.first_name?.trim() ?? "",
      lastName: p.last_name?.trim() ?? "",
      avatarUrl: p.avatar_url?.trim() || null,
      destinationsSummary: sl?.destinationsSummary ?? "—",
      programsSummary: sl?.programsSummary ?? "—",
      applicationsSubmitted: counts.submitted,
      applicationsTotal: counts.total,
      profilePercent: profilePct,
    };
  });

  const totalStudents = totalStudentsRes.count ?? 0;
  const appsSubmittedMonth = appsSubmittedRes.error
    ? 0
    : (appsSubmittedRes.count ?? 0);

  return {
    schoolName,
    monthLabel,
    monthKey,
    monthStartIso,
    monthEndExclusiveIso,
    totalStudents,
    activeStudentsMonth: activeMonth.size,
    needAttentionCount,
    appsSubmittedMonth,
    topDestinations: shortlistTopStats.topDestinations,
    topPrograms: shortlistTopStats.topPrograms,
    advisorSessionsMonth,
    ambassadorSessionsMonth,
    essayReviewsMonth,
    webinarsMonth: 0,
    universitiesShortlistedMonth,
    attentionStudents,
    outcomes,
  };
}
