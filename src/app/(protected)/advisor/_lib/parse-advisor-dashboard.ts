export type AdvisorDashboardKpiCount = {
  total: number;
  thisWeek?: number;
  awaitingFirstCall?: number;
  newThisMonth?: number;
  studentCount?: number;
};

export type AdvisorDashboardKpis = {
  sessionsAndCalls: AdvisorDashboardKpiCount;
  /** @deprecated Prefer sessionsAndCalls; kept for RPC backwards compat. */
  callsCompleted: AdvisorDashboardKpiCount;
  newLeads: AdvisorDashboardKpiCount;
  activePackages: AdvisorDashboardKpiCount;
  conversionAtRisk: { total: number };
  applicationsInProgress: AdvisorDashboardKpiCount;
};

export type AdvisorDashboardConversionMetrics = {
  callToPackagePct: number;
  callsCompletedMonth: number;
  packagesPurchased: number;
  avgDaysCallToSignup: number | null;
  studentsUnderManagement: number;
};

export type AdvisorDashboardTodaysCall = {
  id: string;
  source: "application_call" | "advisor_session";
  time: string | null;
  durationMinutes: number | null;
  studentId: string;
  applicationId: number | null;
  studentName: string;
  callType: string;
  schoolName: string;
  grade: string;
  hasPaid: boolean;
  planUniversitiesCount: number | null;
};

export type AdvisorDashboardAwaitingPayment = {
  applicationId: number;
  studentName: string;
  packageLabel: string;
  amount: number;
  sentAt: string | null;
};

export type AdvisorDashboardUpcomingDeadline = {
  studentId: string;
  applicationId: number | null;
  studentName: string;
  universityName: string;
  program: string | null;
  deadline: string;
  daysUntil: number;
};

export type AdvisorDashboardPayload = {
  kpis: AdvisorDashboardKpis;
  conversionMetrics: AdvisorDashboardConversionMetrics;
  todaysCalls: AdvisorDashboardTodaysCall[];
  awaitingPayment: AdvisorDashboardAwaitingPayment[];
  upcomingDeadlines: AdvisorDashboardUpcomingDeadline[];
};

const EMPTY_KPIS: AdvisorDashboardKpis = {
  sessionsAndCalls: { total: 0, thisWeek: 0 },
  callsCompleted: { total: 0, thisWeek: 0 },
  newLeads: { total: 0, awaitingFirstCall: 0 },
  activePackages: { total: 0, newThisMonth: 0 },
  conversionAtRisk: { total: 0 },
  applicationsInProgress: { total: 0, studentCount: 0 },
};

export const EMPTY_ADVISOR_DASHBOARD: AdvisorDashboardPayload = {
  kpis: EMPTY_KPIS,
  conversionMetrics: {
    callToPackagePct: 0,
    callsCompletedMonth: 0,
    packagesPurchased: 0,
    avgDaysCallToSignup: null,
    studentsUnderManagement: 0,
  },
  todaysCalls: [],
  awaitingPayment: [],
  upcomingDeadlines: [],
};

function asInt(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return fallback;
}

function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = typeof value === "string" ? value.trim() : "";
  return s || null;
}

function parseKpiPair(
  raw: unknown,
  extraKeys: ("this_week" | "awaiting_first_call" | "new_this_month" | "student_count")[] = [],
): AdvisorDashboardKpiCount {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const result: AdvisorDashboardKpiCount = { total: asInt(o.total) };
  if (extraKeys.includes("this_week")) result.thisWeek = asInt(o.this_week);
  if (extraKeys.includes("awaiting_first_call")) {
    result.awaitingFirstCall = asInt(o.awaiting_first_call);
  }
  if (extraKeys.includes("new_this_month")) result.newThisMonth = asInt(o.new_this_month);
  if (extraKeys.includes("student_count")) result.studentCount = asInt(o.student_count);
  return result;
}

function parseTodaysCalls(raw: unknown): AdvisorDashboardTodaysCall[] {
  if (!Array.isArray(raw)) return [];
  const out: AdvisorDashboardTodaysCall[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const source = asString(o.source);
    if (source !== "application_call" && source !== "advisor_session") continue;
    const studentId = asString(o.student_id);
    if (!studentId) continue;
    out.push({
      id: asString(o.id),
      source,
      time: asNullableString(o.time),
      durationMinutes:
        o.duration_minutes === null || o.duration_minutes === undefined
          ? null
          : asInt(o.duration_minutes, 0),
      studentId,
      applicationId:
        o.application_id === null || o.application_id === undefined
          ? null
          : asInt(o.application_id),
      studentName: asString(o.student_name, "Student"),
      callType: asString(o.call_type),
      schoolName: asString(o.school_name),
      grade: asString(o.grade),
      hasPaid: o.has_paid === true,
      planUniversitiesCount:
        o.plan_universities_count === null || o.plan_universities_count === undefined
          ? null
          : asInt(o.plan_universities_count),
    });
  }
  return out;
}

function parseAwaitingPayment(raw: unknown): AdvisorDashboardAwaitingPayment[] {
  if (!Array.isArray(raw)) return [];
  const out: AdvisorDashboardAwaitingPayment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    out.push({
      applicationId: asInt(o.application_id),
      studentName: asString(o.student_name, "Student"),
      packageLabel: asString(o.package_label, "Package"),
      amount: asInt(o.amount),
      sentAt: asNullableString(o.sent_at),
    });
  }
  return out;
}

function parseUpcomingDeadlines(raw: unknown): AdvisorDashboardUpcomingDeadline[] {
  if (!Array.isArray(raw)) return [];
  const out: AdvisorDashboardUpcomingDeadline[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const studentId = asString(o.student_id);
    const deadline = asString(o.deadline);
    if (!studentId || !deadline) continue;
    out.push({
      studentId,
      applicationId:
        o.application_id === null || o.application_id === undefined
          ? null
          : asInt(o.application_id),
      studentName: asString(o.student_name, "Student"),
      universityName: asString(o.university_name, "—"),
      program: asNullableString(o.program),
      deadline,
      daysUntil: asInt(o.days_until),
    });
  }
  return out;
}

/** Parses JSON from `advisor_dashboard` RPC. */
export function parseAdvisorDashboard(raw: unknown): AdvisorDashboardPayload {
  if (!raw || typeof raw !== "object") return EMPTY_ADVISOR_DASHBOARD;
  const o = raw as Record<string, unknown>;

  const kpisRaw = o.kpis && typeof o.kpis === "object" ? (o.kpis as Record<string, unknown>) : {};
  const metricsRaw =
    o.conversion_metrics && typeof o.conversion_metrics === "object"
      ? (o.conversion_metrics as Record<string, unknown>)
      : {};

  const callsCompleted = parseKpiPair(kpisRaw.calls_completed, ["this_week"]);
  const sessionsAndCallsRaw = kpisRaw.sessions_and_calls;
  const sessionsAndCalls = sessionsAndCallsRaw
    ? parseKpiPair(sessionsAndCallsRaw, ["this_week"])
    : callsCompleted;

  return {
    kpis: {
      sessionsAndCalls,
      callsCompleted,
      newLeads: parseKpiPair(kpisRaw.new_leads, ["awaiting_first_call"]),
      activePackages: parseKpiPair(kpisRaw.active_packages, ["new_this_month"]),
      conversionAtRisk: { total: asInt((kpisRaw.conversion_at_risk as Record<string, unknown> | undefined)?.total) },
      applicationsInProgress: parseKpiPair(kpisRaw.applications_in_progress, ["student_count"]),
    },
    conversionMetrics: {
      callToPackagePct: asInt(metricsRaw.call_to_package_pct),
      callsCompletedMonth: asInt(metricsRaw.calls_completed_month),
      packagesPurchased: asInt(metricsRaw.packages_purchased),
      avgDaysCallToSignup: asNullableNumber(metricsRaw.avg_days_call_to_signup),
      studentsUnderManagement: asInt(metricsRaw.students_under_management),
    },
    todaysCalls: parseTodaysCalls(o.todays_calls),
    awaitingPayment: parseAwaitingPayment(o.awaiting_payment),
    upcomingDeadlines: parseUpcomingDeadlines(o.upcoming_deadlines),
  };
}
