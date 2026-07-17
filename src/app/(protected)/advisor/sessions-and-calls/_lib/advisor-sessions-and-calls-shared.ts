import type { LeadQualification } from "@/lib/session-lead-qualification";

export type AdvisorSessionsAndCallsRowKind =
  | "application_lead"
  | "post_admission_lead"
  | "advisor_session";

export type AdvisorSessionsAndCallsRow = {
  kind: AdvisorSessionsAndCallsRowKind;
  id: string;
  studentName: string;
  studentEmail: string;
  schoolName: string;
  meetingAt: string;
  isOverdue: boolean;
  statusLabel: string;
  /** Raw advisor session status (advisor_session rows only). */
  sessionStatus: string | null;
  subtitle: string;
  /** Advisor lead-outcome dropdown value (None / Good lead / Not suitable). */
  leadQualification: LeadQualification;
};

export type AdvisorSessionsAndCallsTypeFilter =
  | "all"
  | "application_lead"
  | "post_admission_lead"
  | "advisor_session";

export type AdvisorSessionsAndCallsPanelProps = {
  rows: AdvisorSessionsAndCallsRow[];
  totalRows: number;
  page: number;
  limit: number;
  search: string;
  type: AdvisorSessionsAndCallsTypeFilter;
  typeCounts: Record<AdvisorSessionsAndCallsTypeFilter, number>;
};

export function advisorSessionsAndCallsKindLabel(
  kind: AdvisorSessionsAndCallsRowKind,
): string {
  if (kind === "application_lead") return "Application lead";
  if (kind === "post_admission_lead") return "Post-admission lead";
  return "Advisor session";
}

export function advisorSessionsAndCallsRowHref(
  kind: AdvisorSessionsAndCallsRowKind,
  id: string,
): string {
  if (kind === "application_lead") return `/advisor/applications/${id}`;
  if (kind === "post_admission_lead") return `/advisor/post-admission/${id}`;
  return `/advisor/sessions-and-calls/session/${id}`;
}

export function parseAdvisorSessionsAndCallsSearch(
  raw: string | string[] | undefined,
): string {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  return value?.trim() ?? "";
}

export function parseAdvisorSessionsAndCallsType(
  raw: string | string[] | undefined,
): AdvisorSessionsAndCallsTypeFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (
    value === "application_lead" ||
    value === "post_admission_lead" ||
    value === "advisor_session"
  ) {
    return value;
  }
  return "all";
}
