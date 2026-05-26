import { NextResponse } from "next/server";

import { parseExcelFirstSheetToRecords } from "@/lib/admin-excel-parse";
import { isExcelFilename } from "@/lib/admin-excel-utils";
import {
  csvToRecords,
  importScholarshipsFromCsvRecords,
} from "@/lib/scholarship-csv-import";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";

export const maxDuration = 300;

const LOG = "[admin-scholarships-import]";

function log(step: string, startedAt: number, extra?: Record<string, unknown>) {
  const elapsedMs = Date.now() - startedAt;
  if (extra) {
    console.log(`${LOG} +${elapsedMs}ms ${step}`, extra);
  } else {
    console.log(`${LOG} +${elapsedMs}ms ${step}`);
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  log("POST received", startedAt);

  const supabaseAuth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  log("auth.getUser done", startedAt, { hasUser: Boolean(user?.id) });

  if (!user) {
    log("rejected: unauthorized", startedAt);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = await createSupabaseSecretClient();
  const { data: adminRow } = await service
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  log("admin lookup done", startedAt, { isAdmin: Boolean(adminRow) });

  if (!adminRow) {
    log("rejected: forbidden", startedAt);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");

  log("formData parsed", startedAt, {
    hasFile: file instanceof File,
    fileName: file instanceof File ? file.name : null,
    fileSize: file instanceof File ? file.size : null,
  });

  if (!(file instanceof File)) {
    log("rejected: missing file field", startedAt);
    return NextResponse.json(
      { error: 'Expected multipart field "file" with an Excel or CSV file' },
      { status: 400 },
    );
  }

  try {
    const isExcel = isExcelFilename(file.name);
    log("reading file bytes", startedAt, { isExcel, fileName: file.name });

    const records = isExcel
      ? await parseExcelFirstSheetToRecords(await file.arrayBuffer())
      : csvToRecords(await file.text());

    log("file parsed to records", startedAt, {
      recordCount: records.length,
      firstRowKeys: records[0] ? Object.keys(records[0]).slice(0, 8) : [],
    });

    if (records.length === 0) {
      log("rejected: no data rows", startedAt);
      return NextResponse.json({ error: "No data rows found in file" }, { status: 400 });
    }

    log("starting DB import", startedAt, { recordCount: records.length });

    const summary = await importScholarshipsFromCsvRecords(service, records, {
      defaultYear: new Date().getFullYear(),
    });

    log("import finished", startedAt, {
      processed: summary.processed,
      scholarshipsUpserted: summary.scholarshipsUpserted,
      errorCount: summary.errors.length,
    });

    log("sending JSON response", startedAt);
    return NextResponse.json(summary);
  } catch (error) {
    log("import failed with error", startedAt, {
      message: error instanceof Error ? error.message : String(error),
    });
    console.error(`${LOG} stack`, error);
    const message = error instanceof Error ? error.message : "Import failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
