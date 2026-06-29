import {
  buildStyledAdminWorkbook,
  ensureExcelFilename,
  triggerExcelDownload,
  type AdminExcelColumnDef,
} from "@/lib/admin-excel-utils";

import type { AdminScholarshipExportRow } from "./fetch-admin-scholarships-export";

export const SCHOLARSHIP_IMPORT_COLUMNS: AdminExcelColumnDef[] = [
  { key: "name", header: "name", width: 28 },
  { key: "nationality_country_code", header: "nationality_country_code", width: 14 },
  { key: "destination_country_codes", header: "destination_country_codes", width: 22 },
  { key: "type", header: "type", width: 12 },
  { key: "description", header: "description", width: 36 },
  { key: "target_students", header: "target_students", width: 18 },
  { key: "level", header: "level", width: 12 },
  { key: "fields", header: "fields", width: 24 },
  { key: "is_renewable", header: "is_renewable", width: 12 },
  { key: "is_active", header: "is_active", width: 10 },
  { key: "is_priority", header: "is_priority", width: 12 },
  { key: "coverage", header: "coverage", width: 16 },
  { key: "competition", header: "competition", width: 12 },
  { key: "tuition_type", header: "tuition_type", width: 12 },
  { key: "tuition", header: "tuition", width: 16 },
  { key: "travel", header: "travel", width: 14 },
  { key: "living_stipend", header: "living_stipend", width: 16 },
  { key: "other_benefits", header: "other_benefits", width: 18 },
  { key: "city", header: "city", width: 14 },
  { key: "academic_eligibility", header: "academic_eligibility", width: 22 },
  { key: "ielts_min", header: "ielts_min", width: 10 },
  { key: "toefl_min", header: "toefl_min", width: 10 },
  { key: "sat_policy", header: "sat_policy", width: 16 },
  { key: "doc_1", header: "doc_1", width: 18 },
  { key: "doc_2", header: "doc_2", width: 18 },
  { key: "doc_3", header: "doc_3", width: 18 },
  { key: "doc_4", header: "doc_4", width: 18 },
  { key: "doc_5", header: "doc_5", width: 18 },
  { key: "deadline_date", header: "deadline_date", width: 14 },
  { key: "deadline", header: "deadline", width: 16 },
  { key: "application_fee", header: "application_fee", width: 14 },
  { key: "intakes", header: "intakes", width: 16 },
  { key: "method", header: "method", width: 16 },
  { key: "application_url", header: "application_url", width: 36 },
  { key: "other", header: "other", width: 16 },
  { key: "tooltip", header: "tooltip", width: 20 },
  { key: "discovery_slug", header: "discovery_slug", width: 24 },
];

export const SCHOLARSHIP_EXCEL_SAMPLE_ROW: Record<string, string> = {
  name: "Sample Government Scholarship",
  nationality_country_code: "EG",
  destination_country_codes: "US,GB,CA",
  type: "government",
  description: "A sample scholarship for import testing",
  target_students: "International students",
  level: "Undergraduate",
  fields: "Engineering,Business",
  is_renewable: "true",
  is_active: "true",
  is_priority: "false",
  coverage: "Full tuition",
  competition: "high",
  tuition_type: "full",
  tuition: "Covered",
  travel: "Round-trip airfare",
  living_stipend: "$1,200/month",
  other_benefits: "Health insurance",
  city: "Boston",
  academic_eligibility: "GPA 3.5+",
  ielts_min: "6.5",
  toefl_min: "90",
  sat_policy: "Optional",
  doc_1: "Transcript",
  doc_2: "Passport",
  doc_3: "Recommendation letter",
  doc_4: "",
  doc_5: "",
  deadline_date: "2026-03-15",
  deadline: "March 15, 2026",
  application_fee: "0",
  intakes: "Fall 2026",
  method: "Online portal",
  application_url: "https://example.edu/apply",
  other: "",
  tooltip: "Shown in the green note box under What's covered on the student detail panel.",
  discovery_slug: "sample-government-scholarship",
};

export const SCHOLARSHIP_EXCEL_SAMPLE_FILENAME = "admin-import-scholarships-template.xlsx";

function exportRowToRecord(row: AdminScholarshipExportRow): Record<string, string> {
  const record: Record<string, string> = {};
  for (const col of SCHOLARSHIP_IMPORT_COLUMNS) {
    record[col.key] = row[col.key as keyof AdminScholarshipExportRow] ?? "";
  }
  return record;
}

export async function buildScholarshipsSampleExcelBuffer(): Promise<ArrayBuffer> {
  return buildStyledAdminWorkbook({
    sheetName: "Scholarships",
    columns: SCHOLARSHIP_IMPORT_COLUMNS,
    rows: [SCHOLARSHIP_EXCEL_SAMPLE_ROW],
    sampleRowIndexes: [0],
  });
}

export async function triggerScholarshipsSampleExcelDownload() {
  const buffer = await buildScholarshipsSampleExcelBuffer();
  triggerExcelDownload(buffer, SCHOLARSHIP_EXCEL_SAMPLE_FILENAME);
}

export async function buildAdminScholarshipsExcelBuffer(
  rows: AdminScholarshipExportRow[],
): Promise<ArrayBuffer> {
  return buildStyledAdminWorkbook({
    sheetName: "Scholarships",
    columns: SCHOLARSHIP_IMPORT_COLUMNS,
    rows: rows.map(exportRowToRecord),
  });
}

export async function triggerAdminScholarshipsExcelDownload(
  rows: AdminScholarshipExportRow[],
  filename: string,
) {
  const buffer = await buildAdminScholarshipsExcelBuffer(rows);
  triggerExcelDownload(buffer, ensureExcelFilename(filename));
}
