import { NextResponse } from "next/server";

import { parseExcelFirstSheetToRecords } from "@/lib/admin-excel-parse";
import { isExcelFilename } from "@/lib/admin-excel-utils";
import { assertAdminImportAccess } from "@/lib/admin-import-route-auth";
import type { ImportProgressPayload } from "@/lib/admin-import-progress";
import { createImportSseStream, importSseResponse } from "@/lib/admin-import-sse";
import { csvToRecords, importScholarshipsFromCsvRecords } from "@/lib/scholarship-csv-import";

export const maxDuration = 600;

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

  const auth = await assertAdminImportAccess();
  if (!auth.ok) {
    log(`rejected: ${auth.error}`, startedAt);
    return NextResponse.json({ error: auth.error }, { status: auth.status });
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

    log("starting DB import (SSE)", startedAt, { recordCount: records.length });

    const stream = createImportSseStream(async (send) => {
      const onProgress = (progress: ImportProgressPayload) => {
        send("progress", progress);
      };

      const summary = await importScholarshipsFromCsvRecords(auth.service, records, {
        defaultYear: new Date().getFullYear(),
        onProgress,
      });

      log("import finished", startedAt, {
        processed: summary.processed,
        scholarshipsUpserted: summary.scholarshipsUpserted,
        errorCount: summary.errors.length,
      });

      return summary;
    });

    log("streaming SSE response", startedAt);
    return importSseResponse(stream);
  } catch (error) {
    log("import failed with error", startedAt, {
      message: error instanceof Error ? error.message : String(error),
    });
    console.error(`${LOG} stack`, error);
    const message = error instanceof Error ? error.message : "Import failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
