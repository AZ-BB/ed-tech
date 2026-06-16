import { isCustomApplicationChecklistSlot } from "@/lib/application-checklist-defaults";
import {
  APPLICATION_CHECKLIST_STATUS_LABEL,
  effectiveApplicationChecklistStatus,
  type ApplicationChecklistStatus,
} from "@/lib/application-checklist-status";
import type { ApplicationChecklistDocRow } from "@/lib/ensure-application-checklist-documents";

export type ApplicationChecklistDocumentRow = {
  id: string;
  slotKey: string;
  displayName: string;
  status: ApplicationChecklistStatus;
  statusLabel: string;
  subtitle: string;
  url: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileType: string | null;
  requestedAt: string | null;
  uploadedAt: string | null;
  reviewedAt: string | null;
  allowNotApplicable: boolean;
  isCustom: boolean;
};

function formatChecklistDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function buildSubtitle(
  status: ApplicationChecklistStatus,
  row: ApplicationChecklistDocRow,
): string {
  if (status === "not_requested") return "Not requested";
  if (status === "not_applicable") return "N/A";
  if (status === "requested") {
    const d = formatChecklistDate(row.requested_at);
    return d ? `Requested ${d}` : "Requested";
  }
  if (status === "under_review") {
    const d = formatChecklistDate(row.uploaded_at ?? row.updated_at);
    return d ? `Uploaded ${d}` : "Under review";
  }
  if (status === "approved") {
    const d = formatChecklistDate(row.reviewed_at ?? row.uploaded_at);
    return d ? `Approved ${d}` : "Approved";
  }
  if (status === "rejected") {
    const d = formatChecklistDate(row.reviewed_at);
    return d ? `Rejected ${d}` : "Rejected";
  }
  return APPLICATION_CHECKLIST_STATUS_LABEL[status];
}

export function mapApplicationChecklistDocumentRow(
  row: ApplicationChecklistDocRow,
): ApplicationChecklistDocumentRow {
  const status = effectiveApplicationChecklistStatus(row.status, row.url);
  const allowNotApplicable = row.slot_key === "portfolio";

  return {
    id: row.id,
    slotKey: row.slot_key,
    displayName: row.display_name?.trim() || "Document",
    status,
    statusLabel: APPLICATION_CHECKLIST_STATUS_LABEL[status],
    subtitle: buildSubtitle(status, row),
    url: row.url?.trim() || null,
    fileName: row.file_name?.trim() || null,
    fileSize: row.file_size,
    fileType: row.file_type?.trim() || null,
    requestedAt: row.requested_at,
    uploadedAt: row.uploaded_at,
    reviewedAt: row.reviewed_at,
    allowNotApplicable,
    isCustom: isCustomApplicationChecklistSlot(row.slot_key),
  };
}

export function mapApplicationChecklistDocuments(
  rows: ApplicationChecklistDocRow[],
): ApplicationChecklistDocumentRow[] {
  return rows.map(mapApplicationChecklistDocumentRow);
}
