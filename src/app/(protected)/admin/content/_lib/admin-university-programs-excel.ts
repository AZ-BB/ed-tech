import {
  buildMultiSheetAdminWorkbook,
  ensureExcelFilename,
  triggerExcelDownload,
  type AdminExcelColumnDef,
} from "@/lib/admin-excel-utils";
import { universityProgramRowToExport } from "@/lib/university-programs-excel-import";
import type { UniversityProgramExportRow } from "@/lib/university-programs-types";

export const UNIVERSITY_PROGRAMS_SHEET_COLUMNS: AdminExcelColumnDef[] = [
  { key: "program_id", header: "program_id", width: 18 },
  { key: "university_name", header: "university_name", width: 28 },
  { key: "ranking_note", header: "ranking_note", width: 28 },
  { key: "tuition_note", header: "tuition_note", width: 18 },
  { key: "short_description", header: "short_description", width: 40 },
  { key: "program_school_note", header: "program_school_note", width: 32 },
  { key: "featured", header: "featured", width: 10 },
];

const SAMPLE_ROWS: UniversityProgramExportRow[] = [
  {
    program_id: "finance",
    university_name: "Stanford University",
    ranking_note: "#3 QS World Ranking (Business)",
    tuition_note: "USD 62,000/year",
    short_description:
      "Top-ranked business program with strong industry connections.",
    program_school_note: "Graduate School of Business",
    featured: "true",
  },
];

export async function buildAdminUniversityProgramsExcelBuffer(
  rows: UniversityProgramExportRow[],
): Promise<ArrayBuffer> {
  return buildMultiSheetAdminWorkbook([
    {
      sheetName: "university_programs",
      columns: UNIVERSITY_PROGRAMS_SHEET_COLUMNS,
      rows: rows.map(universityProgramRowToExport),
      sampleRowIndexes: rows.length === 0 ? [0] : undefined,
    },
  ]);
}

export async function triggerAdminUniversityProgramsExcelDownload(
  rows: UniversityProgramExportRow[],
  filename: string,
) {
  const buffer = await buildAdminUniversityProgramsExcelBuffer(rows);
  triggerExcelDownload(buffer, ensureExcelFilename(filename));
}

export async function triggerUniversityProgramsSampleExcelDownload() {
  await triggerAdminUniversityProgramsExcelDownload(
    SAMPLE_ROWS,
    "university_programs_import_sample.xlsx",
  );
}
