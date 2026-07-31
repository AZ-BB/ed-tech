import { NextResponse } from "next/server";

import { parseExcelFirstSheetToRecords } from "@/lib/admin-excel-parse";
import { isExcelFilename } from "@/lib/admin-excel-utils";
import { assertAdminImportAccess } from "@/lib/admin-import-route-auth";
import type { ImportProgressPayload } from "@/lib/admin-import-progress";
import { createImportSseStream, importSseResponse } from "@/lib/admin-import-sse";
import {
  csvToRecords,
  importEventsFromCsvRecords,
} from "@/lib/events-excel-import";

export const maxDuration = 600;

const LOG = "[admin-events-import]";

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

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'Expected multipart field "file" with an Excel or CSV file' },
      { status: 400 },
    );
  }

  try {
    const isExcel = isExcelFilename(file.name);
    const records = isExcel
      ? await parseExcelFirstSheetToRecords(await file.arrayBuffer())
      : csvToRecords(await file.text());

    if (records.length === 0) {
      return NextResponse.json({ error: "No data rows found in file" }, { status: 400 });
    }

    const stream = createImportSseStream(async (send) => {
      const onProgress = (progress: ImportProgressPayload) => {
        send("progress", progress);
      };

      const summary = await importEventsFromCsvRecords(auth.service, records, {
        onProgress,
      });

      send("complete", summary);
    });

    return importSseResponse(stream);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed.";
    log("failed", startedAt, { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
