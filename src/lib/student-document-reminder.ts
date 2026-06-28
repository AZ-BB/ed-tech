import { normalizeChecklistStatus } from "@/lib/student-application-document-status";

/** True when a reminder to upload is appropriate (no file on record). */
export function isDocumentMissingForReminder(
  status: string,
  storagePath: string | null | undefined,
): boolean {
  if (storagePath?.trim()) return false;
  const normalized = normalizeChecklistStatus(status);
  if (normalized === "not_required") return false;
  return normalized !== "submitted";
}

/** Client/UI helper — show request button when the student still needs to upload. */
export function shouldShowDocumentRequestButton(
  status: string,
  storagePath: string | null | undefined,
): boolean {
  return isDocumentMissingForReminder(status, storagePath);
}
