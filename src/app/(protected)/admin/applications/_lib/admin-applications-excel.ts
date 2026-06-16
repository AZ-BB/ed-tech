import {
  buildStyledAdminWorkbook,
  ensureExcelFilename,
  triggerExcelDownload,
  type AdminExcelColumnDef,
} from "@/lib/admin-excel-utils";

import type { AdminApplicationExportRow } from "./fetch-admin-applications-export";

export const ADMIN_APPLICATIONS_EXCEL_COLUMNS: AdminExcelColumnDef[] = [
  { key: "id", header: "Application ID", width: 14 },
  { key: "status", header: "Status", width: 14 },
  { key: "createdAt", header: "Created", width: 18 },
  { key: "updatedAt", header: "Updated", width: 18 },
  { key: "submittedAt", header: "Submitted", width: 18 },
  { key: "scheduledAt", header: "Scheduled", width: 18 },
  { key: "assignedAt", header: "Advisor assigned", width: 18 },
  { key: "inProgressAt", header: "In Progress", width: 18 },
  { key: "blockedAt", header: "Blocked", width: 18 },
  { key: "studentId", header: "Student ID", width: 38 },
  { key: "studentName", header: "Student Name", width: 22 },
  { key: "studentEmail", header: "Student Email", width: 28 },
  { key: "studentPhone", header: "Student Phone", width: 16 },
  { key: "studentGrade", header: "Student Grade", width: 12 },
  { key: "schoolId", header: "School ID", width: 38 },
  { key: "schoolName", header: "School", width: 24 },
  { key: "schoolCode", header: "School Code", width: 14 },
  { key: "schoolCountry", header: "School Country", width: 18 },
  { key: "advisorName", header: "Advisor", width: 20 },
  { key: "advisorEmail", header: "Advisor Email", width: 28 },
  { key: "planName", header: "Plan", width: 18 },
  { key: "planPrice", header: "Plan Price", width: 12 },
  { key: "planUniversitiesCount", header: "Plan Universities", width: 16 },
  { key: "preferredUniversities", header: "Preferred Universities", width: 36 },
  { key: "preferredUniOrCountries", header: "Preferred Countries/Uni", width: 28 },
  { key: "intendedFields", header: "Intended Fields", width: 24 },
  { key: "openToRelatedFields", header: "Open to Related Fields", width: 18 },
  { key: "curriculum", header: "Curriculum", width: 14 },
  { key: "finalGrade", header: "Final Grade", width: 12 },
  { key: "expectedGraduationYear", header: "Graduation Year", width: 14 },
  { key: "gpa", header: "GPA", width: 8 },
  { key: "sat", header: "SAT", width: 8 },
  { key: "act", header: "ACT", width: 8 },
  { key: "ielts", header: "IELTS", width: 8 },
  { key: "toefl", header: "TOEFL", width: 8 },
  { key: "extracurricularActivities", header: "Extracurriculars", width: 32 },
  { key: "awards", header: "Awards", width: 24 },
];

function applicationRowToRecord(
  row: AdminApplicationExportRow,
): Record<string, string> {
  const record: Record<string, string> = {};
  for (const col of ADMIN_APPLICATIONS_EXCEL_COLUMNS) {
    record[col.key] = row[col.key as keyof AdminApplicationExportRow] ?? "";
  }
  return record;
}

export async function buildAdminApplicationsExcelBuffer(
  rows: AdminApplicationExportRow[],
): Promise<ArrayBuffer> {
  return buildStyledAdminWorkbook({
    sheetName: "Applications",
    columns: ADMIN_APPLICATIONS_EXCEL_COLUMNS,
    rows: rows.map(applicationRowToRecord),
  });
}

export async function triggerAdminApplicationsExcelDownload(
  rows: AdminApplicationExportRow[],
  filename: string,
) {
  const buffer = await buildAdminApplicationsExcelBuffer(rows);
  triggerExcelDownload(buffer, ensureExcelFilename(filename));
}
