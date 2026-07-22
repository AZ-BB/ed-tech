import type { LeadQualification } from "@/lib/session-lead-qualification";
import { LEAD_QUALIFICATION_OPTIONS } from "@/lib/session-lead-qualification";

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
  /** Pending/completed session status for all row kinds. */
  sessionStatus: string;
  subtitle: string;
  /** Advisor lead-outcome dropdown value (None / Good lead / Not suitable). */
  leadQualification: LeadQualification;
};

export type AdvisorSessionsAndCallsTypeFilter =
  | "all"
  | "application_lead"
  | "post_admission_lead"
  | "advisor_session";

export type AdvisorSessionsAndCallsStatusFilter = "" | "pending" | "completed";

export type AdvisorSessionsAndCallsOutcomeFilter = "" | LeadQualification;

export const ADVISOR_SESSIONS_AND_CALLS_STATUS_FILTER_OPTIONS: readonly {
  value: AdvisorSessionsAndCallsStatusFilter;
  label: string;
}[] = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
];

export const ADVISOR_SESSIONS_AND_CALLS_OUTCOME_FILTER_OPTIONS: readonly {
  value: AdvisorSessionsAndCallsOutcomeFilter;
  label: string;
}[] = [
  { value: "", label: "All outcomes" },
  ...LEAD_QUALIFICATION_OPTIONS,
];

export type AdvisorSessionsAndCallsPanelProps = {
  rows: AdvisorSessionsAndCallsRow[];
  totalRows: number;
  page: number;
  limit: number;
  search: string;
  type: AdvisorSessionsAndCallsTypeFilter;
  status: AdvisorSessionsAndCallsStatusFilter;
  outcome: AdvisorSessionsAndCallsOutcomeFilter;
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

const SESSIONS_STATUS_FILTERS = new Set<string>(
  ADVISOR_SESSIONS_AND_CALLS_STATUS_FILTER_OPTIONS.map((option) => option.value),
);

const SESSIONS_OUTCOME_FILTERS = new Set<string>(
  ADVISOR_SESSIONS_AND_CALLS_OUTCOME_FILTER_OPTIONS.map((option) => option.value),
);

export function parseAdvisorSessionsAndCallsStatus(
  raw: string | string[] | undefined,
): AdvisorSessionsAndCallsStatusFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!value || !SESSIONS_STATUS_FILTERS.has(value)) return "";
  return value as AdvisorSessionsAndCallsStatusFilter;
}

export function parseAdvisorSessionsAndCallsOutcome(
  raw: string | string[] | undefined,
): AdvisorSessionsAndCallsOutcomeFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!value || !SESSIONS_OUTCOME_FILTERS.has(value)) return "";
  return value as AdvisorSessionsAndCallsOutcomeFilter;
}

export function matchesAdvisorSessionsAndCallsStatusFilter(
  row: AdvisorSessionsAndCallsRow,
  filter: AdvisorSessionsAndCallsStatusFilter,
): boolean {
  if (!filter) return true;
  return row.sessionStatus === filter;
}

export function matchesAdvisorSessionsAndCallsOutcomeFilter(
  row: AdvisorSessionsAndCallsRow,
  filter: AdvisorSessionsAndCallsOutcomeFilter,
): boolean {
  if (!filter) return true;
  return row.leadQualification === filter;
}
