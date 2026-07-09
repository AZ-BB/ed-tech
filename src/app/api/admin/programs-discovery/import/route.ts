import { NextResponse } from "next/server";

import { parseExcelAllSheetsToRecords } from "@/lib/admin-excel-parse";
import { isExcelFilename } from "@/lib/admin-excel-utils";
import { assertAdminImportAccess } from "@/lib/admin-import-route-auth";
import type { ImportProgressPayload } from "@/lib/admin-import-progress";
import { createImportSseStream, importSseResponse } from "@/lib/admin-import-sse";
import { importProgramsDiscoveryFromExcelSheets } from "@/lib/programs-discovery-excel-import";

export const maxDuration = 600;

export async function POST(request: Request) {
  const auth = await assertAdminImportAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'Expected multipart field "file" with an Excel file' },
      { status: 400 },
    );
  }

  if (!isExcelFilename(file.name)) {
    return NextResponse.json(
      { error: "Programs discovery import requires an Excel (.xlsx) file." },
      { status: 400 },
    );
  }

  try {
    const sheets = await parseExcelAllSheetsToRecords(await file.arrayBuffer());

    if (!sheets.programs?.length) {
      return NextResponse.json(
        { error: 'No data rows found in the "programs" sheet.' },
        { status: 400 },
      );
    }

    const stream = createImportSseStream(async (send) => {
      const onProgress = (progress: ImportProgressPayload) => {
        send("progress", progress);
      };

      return importProgramsDiscoveryFromExcelSheets(auth.service, sheets, {
        onProgress,
      });
    });

    return importSseResponse(stream);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
