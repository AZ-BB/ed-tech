import {
  buildStyledAdminWorkbook,
  ensureExcelFilename,
  triggerExcelDownload,
  type AdminExcelColumnDef,
} from "@/lib/admin-excel-utils";

export const STUDENT_IMPORT_COLUMNS: AdminExcelColumnDef[] = [
  { key: "email", header: "email", width: 34 },
  { key: "grade", header: "grade", width: 16 },
];

export const STUDENT_EXCEL_SAMPLE_ROW: Record<string, string> = {
  email: "student@example.com",
  grade: "Grade 11",
};

export const STUDENT_EXCEL_SAMPLE_FILENAME = "admin-import-students-template.xlsx";

export async function buildStudentsSampleExcelBuffer(): Promise<ArrayBuffer> {
  return buildStyledAdminWorkbook({
    sheetName: "Students",
    columns: STUDENT_IMPORT_COLUMNS,
    rows: [STUDENT_EXCEL_SAMPLE_ROW],
    sampleRowIndexes: [0],
  });
}

export async function triggerStudentsSampleExcelDownload() {
  const buffer = await buildStudentsSampleExcelBuffer();
  triggerExcelDownload(buffer, STUDENT_EXCEL_SAMPLE_FILENAME);
}

export async function triggerStudentsExcelDownload(
  rows: Record<string, string>[],
  filename: string,
) {
  const buffer = await buildStyledAdminWorkbook({
    sheetName: "Students",
    columns: STUDENT_IMPORT_COLUMNS,
    rows,
  });
  triggerExcelDownload(buffer, ensureExcelFilename(filename));
}
