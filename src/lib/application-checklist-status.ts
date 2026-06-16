export const APPLICATION_CHECKLIST_STATUS_VALUES = [
  "not_requested",
  "requested",
  "under_review",
  "approved",
  "rejected",
  "not_applicable",
] as const;

export type ApplicationChecklistStatus =
  (typeof APPLICATION_CHECKLIST_STATUS_VALUES)[number];

export const APPLICATION_CHECKLIST_STATUS_LABEL: Record<
  ApplicationChecklistStatus,
  string
> = {
  not_requested: "Not requested",
  requested: "Requested",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
  not_applicable: "N/A",
};

export function normalizeApplicationChecklistStatus(
  raw: string,
): ApplicationChecklistStatus {
  const t = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if ((APPLICATION_CHECKLIST_STATUS_VALUES as readonly string[]).includes(t)) {
    return t as ApplicationChecklistStatus;
  }
  return "not_requested";
}

export function effectiveApplicationChecklistStatus(
  status: string,
  url: string | null | undefined,
): ApplicationChecklistStatus {
  const normalized = normalizeApplicationChecklistStatus(status);
  const hasFile = !!url?.trim();

  if (hasFile && (normalized === "requested" || normalized === "rejected")) {
    return "under_review";
  }

  if (hasFile && normalized === "not_requested") {
    return "under_review";
  }

  return normalized;
}
