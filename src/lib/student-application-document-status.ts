export const CHECKLIST_STATUS_VALUES = [
  "missing",
  "submitted",
  "needs_review",
  "needs_revision",
  "approved",
  "not_required",
] as const;

export type ChecklistStatusValue = (typeof CHECKLIST_STATUS_VALUES)[number];

export const CHECKLIST_STATUS_LABEL: Record<ChecklistStatusValue, string> = {
  missing: "Missing",
  submitted: "Uploaded",
  needs_review: "Needs review",
  needs_revision: "Needs revision",
  approved: "Approved",
  not_required: "Not required",
};

export function normalizeChecklistStatus(raw: string): ChecklistStatusValue {
  const t = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if ((CHECKLIST_STATUS_VALUES as readonly string[]).includes(t)) {
    return t as ChecklistStatusValue;
  }
  return "missing";
}

export function isValidChecklistStatus(raw: string): raw is ChecklistStatusValue {
  return (CHECKLIST_STATUS_VALUES as readonly string[]).includes(
    normalizeChecklistStatus(raw),
  );
}

export function effectiveChecklistStatus(
  status: string,
  storagePath: string | null,
): ChecklistStatusValue {
  const s = normalizeChecklistStatus(status);
  if (storagePath && s === "missing") return "submitted";
  return s;
}
