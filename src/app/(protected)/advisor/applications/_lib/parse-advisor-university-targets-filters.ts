import {
  parseUniversityTargetDecision,
  parseUniversityTargetStatus,
  UNIVERSITY_TARGET_DECISION_OPTIONS,
  UNIVERSITY_TARGET_STATUS_OPTIONS,
  type UniversityTargetDecision,
  type UniversityTargetStatus,
} from "@/lib/application-university-target-constants";

export type AdvisorUniversityTargetStatusFilter = "all" | UniversityTargetStatus;
export type AdvisorUniversityTargetDecisionFilter = "all" | UniversityTargetDecision;

export const ADVISOR_UNIVERSITY_TARGET_STATUS_FILTER_OPTIONS: readonly {
  value: AdvisorUniversityTargetStatusFilter;
  label: string;
}[] = [
  { value: "all", label: "All statuses" },
  ...UNIVERSITY_TARGET_STATUS_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  })),
];

export const ADVISOR_UNIVERSITY_TARGET_DECISION_FILTER_OPTIONS: readonly {
  value: AdvisorUniversityTargetDecisionFilter;
  label: string;
}[] = [
  { value: "all", label: "All decisions" },
  ...UNIVERSITY_TARGET_DECISION_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  })),
];

function readParam(raw: string | string[] | undefined): string {
  return typeof raw === "string" ? raw : Array.isArray(raw) ? (raw[0] ?? "") : "";
}

export function parseAdvisorUniversityTargetStatusFilter(
  raw: string | string[] | undefined,
): AdvisorUniversityTargetStatusFilter {
  const parsed = parseUniversityTargetStatus(readParam(raw));
  return parsed ?? "all";
}

export function parseAdvisorUniversityTargetDecisionFilter(
  raw: string | string[] | undefined,
): AdvisorUniversityTargetDecisionFilter {
  const parsed = parseUniversityTargetDecision(readParam(raw));
  return parsed ?? "all";
}
