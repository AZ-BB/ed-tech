import { formatDistanceToNow } from "date-fns";

import { fetchAdminApplicationsStats } from "../applications/_lib/fetch-admin-applications-stats";
import {
  formatActivityLogMessageForAdmin,
  type StudentActivityLogItem,
} from "@/lib/student-activity-logs";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import { parseAdminDashboardShortlistTopStats } from "./parse-admin-dashboard-shortlist-stats";

type Trend = {
  label: string;
  direction: "up" | "down" | "neutral";
};

export type AdminDashboardKpiKey =
  | "students"
  | "schools"
  | "ambassador_sessions"
  | "sessions"
  | "applications";

type DashboardKpiCard = {
  key: AdminDashboardKpiKey;
  label: string;
  value: number;
  accentColor: string;
  valueColor: string;
  trend: Trend;
};

export type AdminDashboardActivityItem = {
  id: string;
  text: string;
  timeLabel: string;
  tone: "green" | "blue" | "orange" | "red";
};

export type AdminDashboardAttentionItem = {
  id: string;
  text: string;
  hint: string;
  href: string;
  tone: "orange" | "red";
};

export type AdminDashboardPayload = {
  monthLabel: string;
  kpis: DashboardKpiCard[];
  recentActivity: AdminDashboardActivityItem[];
  attentionItems: AdminDashboardAttentionItem[];
  topSchools: { label: string; value: number }[];
  topUniversities: { label: string; value: number }[];
  topDestinations: { label: string; value: string }[];
};

function monthRangeOffsets(offsetMonths: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 1);
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function trendFromCounts(current: number, previous: number): Trend {
  if (previous <= 0 && current > 0) return { label: `+${current} this month`, direction: "up" };
  if (previous <= 0) return { label: "No change vs last month", direction: "neutral" };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 0) return { label: `+${pct}% vs last month`, direction: "up" };
  if (pct < 0) return { label: `${pct}% vs last month`, direction: "down" };
  return { label: "0% vs last month", direction: "neutral" };
}

async function countCreatedRows(
  table:
    | "student_profiles"
    | "schools"
    | "advisor_sessions"
    | "ambassador_session_requests",
  startIso: string,
  endIso: string,
) {
  const supabase = await createSupabaseSecretClient();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .gte("created_at", startIso)
    .lt("created_at", endIso);
  if (error) return 0;
  return count ?? 0;
}

function activityTone(action: string): AdminDashboardActivityItem["tone"] {
  const normalized = action.trim().toLowerCase();
  if (normalized.includes("delete") || normalized.includes("deactivate")) return "red";
  if (normalized.includes("alert") || normalized.includes("warning")) return "orange";
  if (normalized.includes("update") || normalized.includes("edit")) return "blue";
  return "green";
}

function personNameFromEmbed(
  embed:
    | { first_name: string; last_name: string }
    | { first_name: string; last_name: string }[]
    | null
    | undefined,
): string | null {
  const person = Array.isArray(embed) ? embed[0] : embed;
  if (!person) return null;
  const name = [person.first_name, person.last_name].filter(Boolean).join(" ").trim();
  return name || null;
}

function resolveActivityLogActorName(
  createdByType: StudentActivityLogItem["createdByType"],
  adminName: string | null,
  schoolAdminName: string | null,
  studentName: string | null,
): string | null {
  switch (createdByType) {
    case "admin":
      return adminName;
    case "school_admin":
      return schoolAdminName;
    case "student":
      return studentName;
  }
}

function tokenMeta(creditPool: number | null, yearlyCreditPlan: number | null) {
  if (yearlyCreditPlan == null || yearlyCreditPlan <= 0 || creditPool == null) return null;
  const percent = Math.round((Math.max(0, creditPool) / yearlyCreditPlan) * 100);
  return {
    percent,
    isLowTokens: percent <= 10,
  };
}

export async function fetchAdminDashboard(): Promise<AdminDashboardPayload> {
  const supabase = await createSupabaseSecretClient();
  const monthLabel = new Date().toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const currentMonth = monthRangeOffsets(0);
  const previousMonth = monthRangeOffsets(-1);

  const [
    totalStudentsRes,
    activeSchoolsRes,
    ambassadorSessionsRes,
    advisorSessionsRes,
    appsStats,
    studentsCurrentMonth,
    studentsPreviousMonth,
    schoolsCurrentMonth,
    schoolsPreviousMonth,
    ambassadorSessionsCurrentMonth,
    ambassadorSessionsPreviousMonth,
    sessionsCurrentMonth,
    sessionsPreviousMonth,
    activityRes,
    inactiveStudentsRes,
    pendingAmbassadorRes,
    schoolsCreditRes,
    schoolStudentRowsRes,
    shortlistTopStatsRes,
  ] = await Promise.all([
    supabase.from("student_profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("schools")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase.from("ambassador_session_requests").select("id", { count: "exact", head: true }),
    supabase.from("advisor_sessions").select("id", { count: "exact", head: true }),
    fetchAdminApplicationsStats(),
    countCreatedRows("student_profiles", currentMonth.startIso, currentMonth.endIso),
    countCreatedRows("student_profiles", previousMonth.startIso, previousMonth.endIso),
    countCreatedRows("schools", currentMonth.startIso, currentMonth.endIso),
    countCreatedRows("schools", previousMonth.startIso, previousMonth.endIso),
    countCreatedRows(
      "ambassador_session_requests",
      currentMonth.startIso,
      currentMonth.endIso,
    ),
    countCreatedRows(
      "ambassador_session_requests",
      previousMonth.startIso,
      previousMonth.endIso,
    ),
    countCreatedRows("advisor_sessions", currentMonth.startIso, currentMonth.endIso),
    countCreatedRows("advisor_sessions", previousMonth.startIso, previousMonth.endIso),
    supabase
      .from("acitivity_logs")
      .select(
        `
        id,
        action,
        message,
        created_at,
        created_by_type,
        admins:admin_id ( first_name, last_name ),
        school_admin_profiles:school_admin_id ( first_name, last_name ),
        student_profiles:student_id ( first_name, last_name )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("student_profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_active", false)
      .lt("updated_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from("ambassador_session_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()),
    supabase
      .from("schools")
      .select("name, credit_pool, yearly_credit_plan")
      .eq("is_active", true),
    supabase
      .from("student_profiles")
      .select("school_id, schools(name)")
      .not("school_id", "is", null),
    supabase.rpc("admin_dashboard_shortlist_top_stats", { p_top_n: 5 }),
  ]);

  const totalStudents = totalStudentsRes.count ?? 0;
  const activeSchools = activeSchoolsRes.count ?? 0;
  const ambassadorSessionsBooked = ambassadorSessionsRes.count ?? 0;
  const advisorSessions = advisorSessionsRes.count ?? 0;

  const schoolsTrendCount = schoolsCurrentMonth - schoolsPreviousMonth;
  const schoolsTrendLabel =
    schoolsTrendCount > 0
      ? `+${schoolsTrendCount} new this month`
      : schoolsTrendCount < 0
        ? `${schoolsTrendCount} vs last month`
        : "No new schools this month";

  const kpis: DashboardKpiCard[] = [
    {
      key: "students",
      label: "Total Students",
      value: totalStudents,
      accentColor: "#2D6A4F",
      valueColor: "#2D6A4F",
      trend: trendFromCounts(studentsCurrentMonth, studentsPreviousMonth),
    },
    {
      key: "schools",
      label: "Active Schools",
      value: activeSchools,
      accentColor: "#3498DB",
      valueColor: "#3498DB",
      trend: {
        label: schoolsTrendLabel,
        direction: schoolsTrendCount >= 0 ? "up" : "down",
      },
    },
    {
      key: "ambassador_sessions",
      label: "Ambassador Sessions Booked",
      value: ambassadorSessionsBooked,
      accentColor: "#8E44AD",
      valueColor: "#8E44AD",
      trend: trendFromCounts(ambassadorSessionsCurrentMonth, ambassadorSessionsPreviousMonth),
    },
    {
      key: "sessions",
      label: "Advisor Sessions",
      value: advisorSessions,
      accentColor: "#E67E22",
      valueColor: "#E67E22",
      trend: trendFromCounts(sessionsCurrentMonth, sessionsPreviousMonth),
    },
    {
      key: "applications",
      label: "Applications Active",
      value: appsStats.lead + appsStats.payment_requested + appsStats.active_package,
      accentColor: "#E74C3C",
      valueColor: "#E74C3C",
      trend: {
        label: `${appsStats.unassigned} pending assignment`,
        direction: appsStats.unassigned > 0 ? "down" : "up",
      },
    },
  ];

  const recentActivity: AdminDashboardActivityItem[] = (activityRes.data ?? []).map((row) => {
    const createdByType = row.created_by_type as StudentActivityLogItem["createdByType"];
    const actorName = resolveActivityLogActorName(
      createdByType,
      personNameFromEmbed(row.admins),
      personNameFromEmbed(row.school_admin_profiles),
      personNameFromEmbed(row.student_profiles),
    );
    const rawMessage = row.message?.trim() || "Activity logged";

    return {
      id: String(row.id),
      text: formatActivityLogMessageForAdmin(rawMessage, actorName, createdByType),
      timeLabel: row.created_at
        ? formatDistanceToNow(new Date(row.created_at), { addSuffix: true })
        : "Unknown time",
      tone: activityTone(row.action ?? ""),
    };
  });

  const lowTokenSchools = (schoolsCreditRes.data ?? [])
    .map((row) => ({
      name: row.name.trim(),
      meta: tokenMeta(row.credit_pool, row.yearly_credit_plan),
    }))
    .filter((row): row is { name: string; meta: { percent: number; isLowTokens: boolean } } => !!row.meta)
    .filter((row) => row.meta.isLowTokens)
    .sort((a, b) => a.meta.percent - b.meta.percent);

  const attentionItems: AdminDashboardAttentionItem[] = [];

  if ((appsStats.unassigned ?? 0) > 0) {
    attentionItems.push({
      id: "pending-assignment",
      text: `${appsStats.unassigned} applications pending advisor assignment`,
      hint: "Action required",
      href: "/admin/applications",
      tone: "red",
    });
  }

  const inactiveStudentsCount = inactiveStudentsRes.count ?? 0;
  if (inactiveStudentsCount > 0) {
    attentionItems.push({
      id: "inactive-students",
      text: `${inactiveStudentsCount} students inactive for 14+ days`,
      hint: "Send nudge?",
      href: "/admin/users/students?status=inactive",
      tone: "orange",
    });
  }

  const pendingAmbassadorCount = pendingAmbassadorRes.count ?? 0;
  if (pendingAmbassadorCount > 0) {
    attentionItems.push({
      id: "pending-ambassador",
      text: `${pendingAmbassadorCount} ambassador bookings unconfirmed`,
      hint: "Waiting 48+ hours",
      href: "/admin/sessions/pending",
      tone: "orange",
    });
  }

  if (lowTokenSchools.length > 0) {
    const school = lowTokenSchools[0];
    attentionItems.push({
      id: "low-tokens",
      text: `${school.name} token allocation at ${school.meta.percent}%`,
      hint: "Consider recharge",
      href: "/admin/schools",
      tone: "red",
    });
  }

  const schoolCounts = new Map<string, number>();
  for (const row of schoolStudentRowsRes.data ?? []) {
    const school = Array.isArray(row.schools) ? row.schools[0] : row.schools;
    const schoolName = school?.name?.trim();
    if (!schoolName) continue;
    schoolCounts.set(schoolName, (schoolCounts.get(schoolName) ?? 0) + 1);
  }
  const topSchools = [...schoolCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }));

  const parsedTopStats = parseAdminDashboardShortlistTopStats(shortlistTopStatsRes.data);
  const topUniversities = parsedTopStats.topUniversities.map((item) => ({
    label: item.label,
    value: item.count,
  }));
  const topDestinations = parsedTopStats.topDestinations.map((item) => {
    const percentage =
      parsedTopStats.shortlistRowCount > 0
        ? Math.round((item.count / parsedTopStats.shortlistRowCount) * 100)
        : 0;
    return { label: item.label, value: `${percentage}%` };
  });

  return {
    monthLabel,
    kpis,
    recentActivity,
    attentionItems: attentionItems.slice(0, 5),
    topSchools,
    topUniversities,
    topDestinations,
  };
}
