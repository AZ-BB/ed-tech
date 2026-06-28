/** Client-safe helper — no server-only imports. */
export function advisorStudentDocumentViewPath(documentId: string): string {
  return `/api/advisor/student-documents/${encodeURIComponent(documentId)}/view`;
}
