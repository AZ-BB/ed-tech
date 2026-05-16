/** Risk / follow-up helpers for school portal (display + RPC parsers). */

export function pickLatestActivityIso(
  actAt: string | null | undefined,
  aiAt: string | null | undefined,
): string | null {
  if (!actAt && !aiAt) return null;
  if (!actAt) return aiAt!;
  if (!aiAt) return actAt;
  return new Date(aiAt).getTime() > new Date(actAt).getTime() ? aiAt : actAt;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function noActivityInDays(
  latestActivityIso: string | null | undefined,
  days = 30,
): boolean {
  if (!latestActivityIso) return true;
  try {
    const t = new Date(latestActivityIso).getTime();
    if (Number.isNaN(t)) return true;
    return (Date.now() - t) / MS_PER_DAY >= days;
  } catch {
    return true;
  }
}

export type SchoolStudentFollowUpSignals = {
  profilePercent: number;
  noActivity30Days: boolean;
  hasShortlistedUniversities: boolean;
};

export function needsSchoolStudentFollowUp(
  signals: SchoolStudentFollowUpSignals,
): boolean {
  return (
    signals.profilePercent < 100 ||
    signals.noActivity30Days ||
    !signals.hasShortlistedUniversities
  );
}

export function followUpSignalCount(signals: SchoolStudentFollowUpSignals): number {
  let n = 0;
  if (signals.profilePercent < 100) n += 1;
  if (signals.noActivity30Days) n += 1;
  if (!signals.hasShortlistedUniversities) n += 1;
  return n;
}

export function riskFromFollowUpSignals(
  signals: SchoolStudentFollowUpSignals,
): { riskClass: "green" | "amber" | "red"; riskLabel: string } {
  if (!needsSchoolStudentFollowUp(signals)) {
    return { riskClass: "green", riskLabel: "On track" };
  }
  if (followUpSignalCount(signals) >= 2) {
    return { riskClass: "red", riskLabel: "Urgent" };
  }
  return { riskClass: "amber", riskLabel: "Follow-up" };
}

export function schoolDashboardAttentionIssue(
  signals: SchoolStudentFollowUpSignals,
): string {
  if (signals.noActivity30Days) return "No platform activity in 30+ days";
  if (!signals.hasShortlistedUniversities) {
    return "No universities shortlisted yet";
  }
  if (signals.profilePercent < 100) {
    return `Profile completion is ${signals.profilePercent}% — encourage next steps`;
  }
  return "Needs counselor follow-up";
}

export function gradePriority(grade: string): number {
  const g = grade.trim();
  if (g === "Year 13") return 13;
  if (g === "Grade 12") return 12;
  if (g === "Grade 11") return 11;
  if (g === "Grade 10") return 10;
  if (g === "Grade 9") return 9;
  const m = g.match(/(\d+)/);
  return m ? Number.parseInt(m[1]!, 10) : 0;
}

export type SchoolFollowUpAttentionSortable = {
  grade: string;
  riskClass: "red" | "amber";
  lastName: string;
  firstName: string;
};

export function compareSchoolFollowUpAttention(
  a: SchoolFollowUpAttentionSortable,
  b: SchoolFollowUpAttentionSortable,
): number {
  const gradeDiff = gradePriority(b.grade) - gradePriority(a.grade);
  if (gradeDiff !== 0) return gradeDiff;
  if (a.riskClass !== b.riskClass) return a.riskClass === "red" ? -1 : 1;
  const nameA = `${a.lastName} ${a.firstName}`;
  const nameB = `${b.lastName} ${b.firstName}`;
  return nameA.localeCompare(nameB);
}

export type SchoolStudentFollowUpRpcStudent = {
  id: string;
  first_name: string;
  last_name: string;
  grade: string;
  risk_class: "red" | "amber";
  risk_label: string;
  issue: string;
};

export type SchoolStudentsNeedingFollowUpResult = {
  need_attention_count: number;
  students: SchoolStudentFollowUpRpcStudent[];
};

export type SchoolStudentFollowUpStatusResult = {
  needs_follow_up: boolean;
  risk_class: "green" | "amber" | "red";
  risk_label: string;
  issue: string | null;
  profile_percent: number;
  signals: {
    incomplete_profile: boolean;
    no_activity_30_days: boolean;
    no_shortlist: boolean;
  };
};

function parseRiskClass(v: unknown): "green" | "amber" | "red" | null {
  if (v === "green" || v === "amber" || v === "red") return v;
  return null;
}

function rpcJsonRoot(raw: unknown): Record<string, unknown> | null {
  let v: unknown = raw;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v) as unknown;
    } catch {
      return null;
    }
  }
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function rpcUuidString(v: unknown): string {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (v != null && typeof v === "object" && "toString" in v) {
    const s = String(v);
    if (s && s !== "[object Object]") return s;
  }
  return "";
}

/** Parses JSON from `school_students_needing_follow_up` RPC. */
export function parseSchoolStudentsNeedingFollowUp(
  raw: unknown,
): SchoolStudentsNeedingFollowUpResult {
  const empty: SchoolStudentsNeedingFollowUpResult = {
    need_attention_count: 0,
    students: [],
  };
  const o = rpcJsonRoot(raw);
  if (!o) return empty;

  const countSrc = o.need_attention_count;
  const need_attention_count =
    typeof countSrc === "number"
      ? Math.trunc(countSrc)
      : typeof countSrc === "string"
        ? Number(countSrc)
        : 0;

  const students: SchoolStudentFollowUpRpcStudent[] = [];
  if (Array.isArray(o.students)) {
    for (const item of o.students) {
      if (!item || typeof item !== "object") continue;
      const r = item as Record<string, unknown>;
      const id = rpcUuidString(r.id);
      if (!id) continue;
      const risk_class =
        r.risk_class === "red" || r.risk_class === "amber"
          ? r.risk_class
          : "amber";
      students.push({
        id,
        first_name: typeof r.first_name === "string" ? r.first_name : "",
        last_name: typeof r.last_name === "string" ? r.last_name : "",
        grade: typeof r.grade === "string" ? r.grade : "",
        risk_class,
        risk_label:
          typeof r.risk_label === "string" ? r.risk_label : "Follow-up",
        issue: typeof r.issue === "string" ? r.issue : "",
      });
    }
  }

  return {
    need_attention_count: Number.isFinite(need_attention_count)
      ? need_attention_count
      : 0,
    students,
  };
}

/** Parses JSON from `school_student_follow_up_status` RPC. */
export function parseSchoolStudentFollowUpStatus(
  raw: unknown,
): SchoolStudentFollowUpStatusResult | null {
  if (raw == null) return null;
  const o = rpcJsonRoot(raw);
  if (!o) return null;

  const risk_class = parseRiskClass(o.risk_class);
  if (!risk_class) return null;

  const signalsRaw = o.signals;
  let signals = {
    incomplete_profile: false,
    no_activity_30_days: false,
    no_shortlist: false,
  };
  if (signalsRaw && typeof signalsRaw === "object") {
    const s = signalsRaw as Record<string, unknown>;
    signals = {
      incomplete_profile: s.incomplete_profile === true,
      no_activity_30_days: s.no_activity_30_days === true,
      no_shortlist: s.no_shortlist === true,
    };
  }

  const profileSrc = o.profile_percent;
  const profile_percent =
    typeof profileSrc === "number"
      ? Math.trunc(profileSrc)
      : typeof profileSrc === "string"
        ? Number(profileSrc)
        : 0;

  return {
    needs_follow_up: o.needs_follow_up === true,
    risk_class,
    risk_label: typeof o.risk_label === "string" ? o.risk_label : "On track",
    issue: typeof o.issue === "string" ? o.issue : null,
    profile_percent: Number.isFinite(profile_percent) ? profile_percent : 0,
    signals,
  };
}
