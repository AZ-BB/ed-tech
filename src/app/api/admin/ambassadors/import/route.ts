import { NextResponse } from "next/server";

import {
  importAmbassadorsFromCsvText,
  importAmbassadorsFromExcelBuffer,
} from "@/lib/ambassador-csv-import";
import { isExcelFilename } from "@/lib/admin-excel-utils";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";

export async function POST(request: Request) {
  const supabaseAuth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = await createSupabaseSecretClient();
  const { data: adminRow } = await service
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!adminRow) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'Expected multipart field "file" with an Excel or CSV file' },
      { status: 400 },
    );
  }

  const summary = isExcelFilename(file.name)
    ? await importAmbassadorsFromExcelBuffer(await file.arrayBuffer())
    : await importAmbassadorsFromCsvText(await file.text());

  return NextResponse.json(summary);
}
