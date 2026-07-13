import { NextResponse } from "next/server";
import { exportPortableDocument } from "@/lib/discovery/discovery-repository";
import { assertAdminImportAccess } from "@/lib/admin-import-route-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await assertAdminImportAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const document = await exportPortableDocument(auth.service);
    const day = new Date().toISOString().slice(0, 10);
    const body = JSON.stringify(document, null, 2);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="discovery-journey-config-${day}.json"`,
      },
    });
  } catch (error) {
    console.error("[admin/discovery-journey/export] GET", error);
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}
