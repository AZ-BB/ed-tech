import type { Database } from "@/database.types";

export type LeadQualification =
  | "none"
  | "good_lead"
  | "not_suitable";

export type LeadQualificationStored = "good_lead" | "not_suitable";

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
];

export function parseLeadQualification(
  raw: string | null | undefined,
): LeadQualification {
  if (raw === "good_lead" || raw === "not_suitable") return raw;
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
