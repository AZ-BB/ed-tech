import { assertAdminDocumentViewRouteAccess } from "@/lib/admin-document-route-auth";
import { getAdminStudentDocumentSignedUrl } from "@/lib/admin-student-document-view";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ documentId: string }> },
) {
  const auth = await assertAdminDocumentViewRouteAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { documentId } = await context.params;
  const result = await getAdminStudentDocumentSignedUrl(auth.service, documentId);

  if ("error" in result) {
    const status = result.error === "Invalid document." ? 400 : 404;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.redirect(result.url);
}
