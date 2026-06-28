import { assertAdvisorDocumentEditRouteAccess } from "@/lib/advisor-document-route-auth";
import { uploadAdminStudentDocumentFile } from "@/lib/admin-student-document-upload";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid upload payload." },
      { status: 400 },
    );
  }

  const documentId = String(form.get("documentId") ?? "").trim();
  const auth = await assertAdvisorDocumentEditRouteAccess(documentId);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: 'Expected multipart field "file".' },
      { status: 400 },
    );
  }

  const result = await uploadAdminStudentDocumentFile(
    auth.service,
    documentId,
    file,
  );

  if (!result.ok) {
    const status =
      result.error === "Document not found." ? 404 : 400;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
