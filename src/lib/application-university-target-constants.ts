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

export const MAX_UNIVERSITY_TARGET_NAME = 200;
export const MAX_UNIVERSITY_TARGET_PROGRAM = 200;
export const MAX_UNIVERSITY_TARGET_NOTES = 4000;
export const MAX_UNIVERSITY_DOC_NAME = 200;
export const MAX_UNIVERSITY_DOC_REQUIREMENTS = 30;
