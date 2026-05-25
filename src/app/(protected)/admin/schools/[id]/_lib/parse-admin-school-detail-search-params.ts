import { parseAmbassadorSessionStatusFilter } from "@/app/(protected)/admin/users/ambassadors/[id]/_lib/fetch-ambassador-sessions-page";
import { parseAdvisorSessionStatusFilter } from "@/app/(protected)/admin/users/advisors/[id]/_lib/fetch-advisor-sessions-page";

export type AdminSchoolDetailTab =
  | "overview"
  | "students"
  | "teachers"
  | "sessions"
  | "logs";

export type AdminSchoolSessionKind = "advisor" | "ambassador";

export type AdminSchoolDetailSearchParams = {
  tab: AdminSchoolDetailTab;
  sessionKind: AdminSchoolSessionKind;
  advisorSessionStatus: ReturnType<typeof parseAdvisorSessionStatusFilter>;
  ambassadorSessionStatus: ReturnType<typeof parseAmbassadorSessionStatusFilter>;
  sessionsPage: number;
  sessionsLimit: number;
  activityLogsPage: number;
  activityLogsLimit: number;
};

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function parseTab(raw: string | string[] | undefined): AdminSchoolDetailTab {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (
    value === "students" ||
    value === "teachers" ||
    value === "sessions" ||
    value === "logs"
  ) {
    return value;
  }
  return "overview";
}

function parseSessionKind(raw: string | string[] | undefined): AdminSchoolSessionKind {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  return value === "ambassador" ? "ambassador" : "advisor";
}

export function parseAdminSchoolDetailSearchParams(
  sp: Record<string, string | string[] | undefined>,
): AdminSchoolDetailSearchParams {
  const tab = parseTab(sp.tab);
  const sessionKind = parseSessionKind(sp.sessionKind);

  return {
    tab,
    sessionKind,
    advisorSessionStatus: parseAdvisorSessionStatusFilter(sp.sessionStatus),
    ambassadorSessionStatus: parseAmbassadorSessionStatusFilter(sp.sessionStatus),
    sessionsPage: Math.max(1, parseIntParam(sp.sessionsPage, 1)),
    sessionsLimit: Math.min(50, Math.max(5, parseIntParam(sp.sessionsLimit, 10))),
    activityLogsPage: Math.max(1, parseIntParam(sp.activityLogsPage, 1)),
    activityLogsLimit: Math.min(
      50,
      Math.max(5, parseIntParam(sp.activityLogsLimit, 12)),
    ),
  };
}
