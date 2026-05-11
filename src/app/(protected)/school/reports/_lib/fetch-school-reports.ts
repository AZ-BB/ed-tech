import type { Database } from "@/database.types";
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

import { parseSchoolDashboardShortlistTopStats } from "../../_lib/parse-shortlist-top-stats";

type SupabaseServer = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const PAGE_SIZE = 1000;
const REPORTS_SHORTLIST_TOP_N = 6;
const STUDENT_CHUNK = 150;

export type SchoolReportsAttentionRow = {
  id: string;
  firstName: string;
  lastName: string;
  grade: string | null;
  initials: string;
  riskClass: "red" | "amber";
  riskLabel: string;
  issue: string;
};

export type SchoolReportsOutcomeRow = {
  studentId: string;
  firstName: string;
  lastName: string;
  initials: string;
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

function initialsFromStudent(first: string, last: string): string {
  const a = first.trim()[0];
  const b = last.trim()[0];
  const pair = `${a ?? ""}${b ?? ""}`.toUpperCase();
  if (pair) return pair.slice(0, 2);
  if (a) return a.toUpperCase();
  return "?";
}

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
        "student_id, grade, curriculum, preferred_destinations, interested_programs, english_test_scores, sat_score, act_score, sat_act_scores",
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

async function scanActivitiesFullSchool(
  supabase: SupabaseServer,
): Promise<{ maxByStudent: Map<string, number> }> {
  const maxByStudent = new Map<string, number>();
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("student_activities")
      .select("student_id, created_at")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error(
        "[fetchSchoolReports] student_activities scan:",
        error.message,
      );
      break;
    }
    if (!data?.length) break;
    for (const row of data) {
      mergeMaxTime(maxByStudent, row.student_id, row.created_at);
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return { maxByStudent };
}

async function scanAiUsageFullSchool(
  supabase: SupabaseServer,
): Promise<{ maxByStudent: Map<string, number> }> {
  const maxByStudent = new Map<string, number>();
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("ai_usage")
      .select("student_id, created_at")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("[fetchSchoolReports] ai_usage scan:", error.message);
      break;
    }
    if (!data?.length) break;
    for (const row of data) {
      mergeMaxTime(maxByStudent, row.student_id, row.created_at);
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return { maxByStudent };
}

export async function fetchSchoolReports(): Promise<SchoolReportsPayload | null> {
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

  const [totalStudentsRes, shortlistRpcRes, profilesRes, appsSubmittedRes] =
    await Promise.all([
      supabase
        .from("student_profiles")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId),
      supabase.rpc("school_dashboard_shortlist_top_stats", {
        p_top_n: REPORTS_SHORTLIST_TOP_N,
      }),
      supabase
        .from("student_profiles")
        .select("id, first_name, last_name, grade, updated_at, created_at")
        .eq("school_id", schoolId)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true }),
      supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq(
          "status",
          "submitted" satisfies Database["public"]["Enums"]["application_status"],
        )
        .gte("submitted_at", monthStartIso)
        .lt("submitted_at", monthEndExclusiveIso),
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
    actScan,
    aiScan,
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
    scanActivitiesFullSchool(supabase),
    scanAiUsageFullSchool(supabase),
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

  const attentionRaw: SchoolReportsAttentionRow[] = [];
  let needAttentionCount = 0;

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
    if (riskClass !== "green") needAttentionCount += 1;
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
      initials: initialsFromStudent(
        p.first_name?.trim() ?? "",
        p.last_name?.trim() ?? "",
      ),
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
    attentionStudents: attentionRaw,
    outcomes,
  };
}
