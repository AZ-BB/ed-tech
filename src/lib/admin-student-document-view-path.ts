/** Client-safe helper — no server-only imports. */
export function adminStudentDocumentViewPath(documentId: string): string {
  return `/api/admin/student-documents/${encodeURIComponent(documentId)}/view`;
}
