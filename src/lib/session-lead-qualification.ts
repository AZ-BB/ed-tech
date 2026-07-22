import type { Database } from "@/database.types";

export type LeadQualification =
  | "none"
  | "good_lead"
  | "not_suitable"
  | "no_show";

export type LeadQualificationStored = "good_lead" | "not_suitable" | "no_show";

export type SessionLeadQualificationSource =
  | "advisor_session"
  | "application_lead"
  | "post_admission_lead";

export const LEAD_QUALIFICATION_OPTIONS: {
  value: LeadQualification;
  label: string;
}[] = [
  { value: "none", label: "None" },
  { value: "good_lead", label: "Good lead" },
  { value: "not_suitable", label: "Not suitable" },
  { value: "no_show", label: "No show" },
];

const OUTCOME_SELECT_BASE_CLASS =
  "min-w-[120px] cursor-pointer appearance-none rounded-[8px] border bg-[length:10px_6px] bg-[position:right_8px_center] bg-no-repeat py-[6px] pl-[10px] pr-8 text-[12px] outline-none transition-colors focus:border-[#40916C] disabled:cursor-not-allowed disabled:opacity-60";

export function leadQualificationSelectClass(value: LeadQualification): string {
  switch (value) {
    case "good_lead":
      return `${OUTCOME_SELECT_BASE_CLASS} border-[#b7dfc9] bg-[#f0faf4] text-[#2D6A4F]`;
    case "not_suitable":
      return `${OUTCOME_SELECT_BASE_CLASS} border-[#f5c6c6] bg-[#fef2f2] text-[#b91c1c]`;
    case "no_show":
      return `${OUTCOME_SELECT_BASE_CLASS} border-[#fde68a] bg-[#fffbeb] text-[#b45309]`;
    default:
      return `${OUTCOME_SELECT_BASE_CLASS} border-[#e0deda] bg-white text-[#4a4a4a]`;
  }
}

export function parseLeadQualification(
  raw: string | null | undefined,
): LeadQualification {
  if (raw === "good_lead" || raw === "not_suitable" || raw === "no_show") {
    return raw;
  }
  return "none";
}

export function leadQualificationToStored(
  value: LeadQualification,
): LeadQualificationStored | null {
  if (value === "none") return null;
  return value;
}

/** Statuses that should appear as scheduled application calls in Sessions & Calls. */
export const SESSION_CALL_APPLICATION_STATUSES = [
  "intake_draft",
  "lead",
  "payment_requested",
  "active_package",
] as const satisfies ReadonlyArray<
  Database["public"]["Enums"]["application_status"]
>;

/** Statuses that should appear as scheduled post-admission calls in Sessions & Calls. */
export const SESSION_CALL_POST_ADMISSION_STATUSES = [
  "intake_draft",
  "lead",
  "payment_requested",
  "active",
] as const satisfies ReadonlyArray<
  Database["public"]["Enums"]["post_admission_status"]
>;
