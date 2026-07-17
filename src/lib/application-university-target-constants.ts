import type { Database } from "@/database.types";

export type UniversityTargetStatus =
  Database["public"]["Enums"]["university_target_status"];

export type UniversityTargetDecision =
  Database["public"]["Enums"]["university_target_decision"];

export type UniversityDocRequirementStatus =
  Database["public"]["Enums"]["university_doc_requirement_status"];

export const UNIVERSITY_TARGET_STATUS_OPTIONS = [
  { value: "in_progress", label: "In progress" },
  { value: "ready_to_submit", label: "Ready to submit" },
  { value: "submitted", label: "Submitted" },
] as const satisfies ReadonlyArray<{
  value: UniversityTargetStatus;
  label: string;
}>;

export const UNIVERSITY_TARGET_DECISION_OPTIONS = [
  { value: "not_submitted", label: "Not submitted" },
  { value: "awaiting_decision", label: "Awaiting decision" },
  { value: "offer_received", label: "Offer received" },
  { value: "rejected", label: "Rejected" },
  { value: "waitlist", label: "Waitlist" },
] as const satisfies ReadonlyArray<{
  value: UniversityTargetDecision;
  label: string;
}>;

export const UNIVERSITY_DOC_REQUIREMENT_STATUS_OPTIONS = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "complete", label: "Complete" },
  { value: "not_required", label: "Not required" },
] as const satisfies ReadonlyArray<{
  value: UniversityDocRequirementStatus;
  label: string;
}>;

const VALID_TARGET_STATUSES = new Set<string>(
  UNIVERSITY_TARGET_STATUS_OPTIONS.map((o) => o.value),
);
const VALID_DECISIONS = new Set<string>(
  UNIVERSITY_TARGET_DECISION_OPTIONS.map((o) => o.value),
);
const VALID_DOC_STATUSES = new Set<string>(
  UNIVERSITY_DOC_REQUIREMENT_STATUS_OPTIONS.map((o) => o.value),
);

export const UNIVERSITY_TARGET_STATUS_LABEL: Record<UniversityTargetStatus, string> = {
  shortlisted: "Shortlisted",
  considering: "Considering",
  advisor_recommended: "Advisor recommended",
  documents_needed: "Documents needed",
  in_progress: "In progress",
  ready_to_submit: "Ready to submit",
  submitted: "Submitted",
};

export const UNIVERSITY_TARGET_DECISION_LABEL: Record<UniversityTargetDecision, string> = {
  not_submitted: "Not submitted",
  awaiting_decision: "Awaiting decision",
  offer_received: "Offer received",
  rejected: "Rejected",
  waitlist: "Waitlist",
};

export const UNIVERSITY_DOC_REQUIREMENT_STATUS_LABEL: Record<
  UniversityDocRequirementStatus,
  string
> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
  not_required: "Not required",
};

export function parseUniversityTargetStatus(raw: string): UniversityTargetStatus | null {
  const value = raw.trim();
  if (!VALID_TARGET_STATUSES.has(value)) return null;
  return value as UniversityTargetStatus;
}

export function parseUniversityTargetDecision(raw: string): UniversityTargetDecision | null {
  const value = raw.trim();
  if (!VALID_DECISIONS.has(value)) return null;
  return value as UniversityTargetDecision;
}

export function parseUniversityDocRequirementStatus(
  raw: string,
): UniversityDocRequirementStatus | null {
  const value = raw.trim();
  if (!VALID_DOC_STATUSES.has(value)) return null;
  return value as UniversityDocRequirementStatus;
}

export function universityTargetStatusPillClass(status: string): string {
  switch (status) {
    case "submitted":
      return "bg-[rgba(52,152,219,.12)] text-[#1d4d70]";
    case "ready_to_submit":
      return "bg-[rgba(82,183,135,.13)] text-[#1B4332]";
    case "in_progress":
      return "bg-[rgba(212,162,42,.14)] text-[#7a5d10]";
    default:
      return "bg-[#ECEAE5] text-[var(--text-mid)]";
  }
}

export function universityTargetDecisionPillClass(decision: string): string {
  switch (decision) {
    case "offer_received":
      return "bg-[rgba(82,183,135,.13)] text-[#1B4332]";
    case "awaiting_decision":
      return "bg-[rgba(52,152,219,.12)] text-[#1d4d70]";
    case "rejected":
      return "bg-[rgba(231,76,60,.12)] text-[#8c2d22]";
    case "waitlist":
      return "bg-[#EDE7F6] text-[#5E35B1]";
    case "not_submitted":
    default:
      return "bg-[#ECEAE5] text-[var(--text-mid)]";
  }
}

const UNIVERSITY_TARGET_SELECT_BASE_CLASS =
  "cursor-pointer appearance-none rounded-[8px] border bg-[length:10px_6px] bg-[position:right_6px_center] bg-no-repeat py-1 pl-2 pr-6 text-[13px] outline-none transition-colors focus:border-[#40916C] disabled:cursor-not-allowed disabled:opacity-60";

export function universityTargetStatusSelectClass(status: string): string {
  const sizeClass = "w-[118px] max-w-[118px]";

  switch (status) {
    case "in_progress":
      return `${UNIVERSITY_TARGET_SELECT_BASE_CLASS} ${sizeClass} border-[#fde68a] bg-[#fffbeb] text-[#7a5d10]`;
    case "ready_to_submit":
      return `${UNIVERSITY_TARGET_SELECT_BASE_CLASS} ${sizeClass} border-[#b7dfc9] bg-[#f0faf4] text-[#1B4332]`;
    case "submitted":
      return `${UNIVERSITY_TARGET_SELECT_BASE_CLASS} ${sizeClass} border-[#bfdbfe] bg-[#eff6ff] text-[#1d4d70]`;
    default:
      return `${UNIVERSITY_TARGET_SELECT_BASE_CLASS} ${sizeClass} border-[#e0deda] bg-white text-[#1a1a1a]`;
  }
}

export function universityTargetDecisionSelectClass(decision: string): string {
  const sizeClass = "w-[128px] max-w-[128px]";

  switch (decision) {
    case "offer_received":
      return `${UNIVERSITY_TARGET_SELECT_BASE_CLASS} ${sizeClass} border-[#b7dfc9] bg-[#f0faf4] text-[#1B4332]`;
    case "awaiting_decision":
      return `${UNIVERSITY_TARGET_SELECT_BASE_CLASS} ${sizeClass} border-[#bfdbfe] bg-[#eff6ff] text-[#1d4d70]`;
    case "rejected":
      return `${UNIVERSITY_TARGET_SELECT_BASE_CLASS} ${sizeClass} border-[#f5c6c6] bg-[#fef2f2] text-[#8c2d22]`;
    case "waitlist":
      return `${UNIVERSITY_TARGET_SELECT_BASE_CLASS} ${sizeClass} border-[#d8b4fe] bg-[#faf5ff] text-[#5E35B1]`;
    case "not_submitted":
    default:
      return `${UNIVERSITY_TARGET_SELECT_BASE_CLASS} ${sizeClass} border-[#e0deda] bg-[#f5f5f4] text-[#6a6a6a]`;
  }
}

export const MAX_UNIVERSITY_TARGET_NAME = 200;
export const MAX_UNIVERSITY_TARGET_PROGRAM = 200;
export const MAX_UNIVERSITY_TARGET_NOTES = 4000;
export const MAX_UNIVERSITY_DOC_NAME = 200;
export const MAX_UNIVERSITY_DOC_REQUIREMENTS = 30;
