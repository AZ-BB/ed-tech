/** Stored on `student_shortlist_universities` — counselor-facing labels on school portal. */
export const SHORTLIST_DOCS_STATUSES = ["completed", "not_completed"] as const;
export type ShortlistDocsStatus = (typeof SHORTLIST_DOCS_STATUSES)[number];

export const SHORTLIST_ESSAY_STATUSES = ["approved", "not_reviewed"] as const;
export type ShortlistEssayStatus = (typeof SHORTLIST_ESSAY_STATUSES)[number];

export const SHORTLIST_DOCS_STATUS_LABEL: Record<ShortlistDocsStatus, string> = {
  completed: "Completed",
  not_completed: "Not Completed",
};

export const SHORTLIST_ESSAY_STATUS_LABEL: Record<ShortlistEssayStatus, string> = {
  approved: "Approved",
  not_reviewed: "Not Reviewed",
};
