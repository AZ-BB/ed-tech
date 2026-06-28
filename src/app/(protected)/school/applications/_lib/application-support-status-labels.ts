/**
 * School portal filter vocabulary for My Applications shortlist rows
 * (`student_shortlist_universities.status` / `decision`).
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

const ALLOWED_FILTER = new Set<string>(SCHOOL_APPLICATION_FILTER_STATUSES);

/** Legacy `applications.status` query params from older URLs. */
const LEGACY_DB_STATUS_TO_FILTER: Record<string, SchoolApplicationFilterStatus> =
  {
    new: "considering",
    assigned: "shortlisted",
    scheduled: "shortlisted",
    payment_in_progress: "preparing_application",
    payment_completed: "preparing_application",
    in_progress: "preparing_application",
    submitted: "submitted",
    blocked: "rejected",
  };

/** Resolve `?status=` query param to a shortlist filter key. */
export function schoolApplicationFilterToShortlistStatus(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (ALLOWED_FILTER.has(t)) return t;
  return LEGACY_DB_STATUS_TO_FILTER[t] ?? "";
}
