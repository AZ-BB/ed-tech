import type { Database } from "@/database.types";

/**
 * School portal filter / display vocabulary (aligned with student shortlist wording).
 * Maps to `public.applications.status` enum rows.
 */
export const SCHOOL_APPLICATION_FILTER_STATUSES = [
  "considering",
  "shortlisted",
  "preparing_application",
  "submitted",
  "rejected",
] as const;

export type SchoolApplicationFilterStatus =
  (typeof SCHOOL_APPLICATION_FILTER_STATUSES)[number];

export const SCHOOL_APPLICATION_FILTER_LABEL: Record<
  SchoolApplicationFilterStatus,
  string
> = {
  considering: "Considering",
  shortlisted: "Shortlisted",
  preparing_application: "Preparing application",
  submitted: "Submitted",
  rejected: "Rejected",
};

/** DB enum value → label shown in the table and filters. */
export const DB_APPLICATION_STATUS_DISPLAY: Record<string, string> = {
  new: SCHOOL_APPLICATION_FILTER_LABEL.considering,
  assigned: SCHOOL_APPLICATION_FILTER_LABEL.shortlisted,
  in_progress: SCHOOL_APPLICATION_FILTER_LABEL.preparing_application,
  submitted: SCHOOL_APPLICATION_FILTER_LABEL.submitted,
  blocked: SCHOOL_APPLICATION_FILTER_LABEL.rejected,
};

const FILTER_TO_DB: Record<
  SchoolApplicationFilterStatus,
  Database["public"]["Enums"]["application_status"]
> = {
  considering: "new",
  shortlisted: "assigned",
  preparing_application: "in_progress",
  submitted: "submitted",
  rejected: "blocked",
};

const ALLOWED_FILTER = new Set<string>(SCHOOL_APPLICATION_FILTER_STATUSES);

const LEGACY_DB_STATUS = new Set<string>([
  "new",
  "assigned",
  "in_progress",
  "blocked",
  "submitted",
]);

/** Resolve `?status=` query param to a DB `applications.status` value. */
export function schoolApplicationFilterToDbStatus(
  raw: string,
): Database["public"]["Enums"]["application_status"] | "" {
  const t = raw.trim();
  if (!t) return "";
  if (ALLOWED_FILTER.has(t)) {
    return FILTER_TO_DB[t as SchoolApplicationFilterStatus];
  }
  if (LEGACY_DB_STATUS.has(t)) {
    return t as Database["public"]["Enums"]["application_status"];
  }
  return "";
}
