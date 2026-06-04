import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { assertAdminImportAccess } from "@/lib/admin-import-route-auth";
import {
  uploadUniversityImageToStorage,
  universityImageColumn,
  type UniversityImageKind,
} from "@/lib/university-image-upload";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseKind(raw: FormDataEntryValue | null): UniversityImageKind | null {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "logo" || value === "cover") return value;
  return null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await assertAdminImportAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: universityId } = await context.params;
  if (!UUID_RE.test(universityId)) {
    return NextResponse.json({ error: "Invalid university." }, { status: 400 });
  }

  const { data: university, error: fetchError } = await auth.service
    .from("universities")
    .select("id")
    .eq("id", universityId)
    .maybeSingle();

  if (fetchError) {
    console.error("[admin-university-images] fetch", fetchError);
    return NextResponse.json({ error: "Could not load university." }, { status: 500 });
  }

  if (!university) {
    return NextResponse.json({ error: "University not found." }, { status: 404 });
  }

  const form = await request.formData();
  const kind = parseKind(form.get("kind"));
  const file = form.get("file");

  if (!kind) {
    return NextResponse.json(
      { error: 'Expected form field "kind" with value "logo" or "cover".' },
      { status: 400 },
    );
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: 'Expected multipart field "file" with an image.' },
      { status: 400 },
    );
  }

  try {
    const url = await uploadUniversityImageToStorage(
      auth.service,
      universityId,
      kind,
      file,
    );

    const column = universityImageColumn(kind);
    const { error: updateError } = await auth.service
      .from("universities")
      .update({ [column]: url, updated_at: new Date().toISOString() })
      .eq("id", universityId);

    if (updateError) {
      console.error("[admin-university-images] update", updateError);
      return NextResponse.json(
        { error: "Image uploaded but could not save to the university." },
        { status: 500 },
      );
    }

    revalidatePath("/admin/content");
    revalidatePath(`/admin/content/universities/${universityId}`);
    revalidatePath(`/student/universities/${universityId}`);

    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not upload image.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
