import { NextResponse } from "next/server";
import { replaceAllFromImport } from "@/lib/discovery/discovery-repository";
import { validatePortableDiscoveryDocument } from "@/lib/discovery/validateDiscoveryConfig";
import { assertAdminImportAccess } from "@/lib/admin-import-route-auth";
import { createSupabaseServerClient } from "@/utils/supabase-server";

export const dynamic = "force-dynamic";

async function parseImportBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new Error("file is required.");
    }
    const text = await file.text();
    return JSON.parse(text);
  }

  return request.json();
}

export async function POST(request: Request) {
  const auth = await assertAdminImportAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let raw: unknown;
  try {
    raw = await parseImportBody(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid import payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const validation = validatePortableDiscoveryDocument(raw);
  if (!validation.ok) {
    return NextResponse.json(
      { error: "Validation failed.", details: validation.errors },
      { status: 400 },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const adminId = user?.id ?? null;

    const settings = await replaceAllFromImport(
      auth.service,
      validation.document,
      adminId,
    );

    return NextResponse.json({
      ok: true,
      moduleCount: validation.document.tests.length,
      version: settings.version,
    });
  } catch (error) {
    console.error("[admin/discovery-journey/import] POST", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed." },
      { status: 500 },
    );
  }
}
