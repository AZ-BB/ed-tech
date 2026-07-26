import { assertAdminLessonRouteAccess } from "@/lib/admin-lesson-route-auth";
import {
  createAdminLessonDocumentWithFile,
  replaceAdminLessonDocumentFile,
} from "@/lib/admin-lesson-document-upload";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const auth = await assertAdminLessonRouteAccess();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid upload payload." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: 'Expected multipart field "file".' },
      { status: 400 },
    );
  }

  const documentId = String(form.get("documentId") ?? "").trim();

  const result = documentId
    ? await replaceAdminLessonDocumentFile(auth.service, documentId, file)
    : await createAdminLessonDocumentWithFile(auth.service, {
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? ""),
        file,
      });

  if (!result.ok) {
    const status =
      result.error === "Lesson document not found." ? 404 : 400;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, documentId: result.documentId });
}
