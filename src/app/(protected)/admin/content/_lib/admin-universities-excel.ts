import {
  buildStyledAdminWorkbook,
  ensureExcelFilename,
  triggerExcelDownload,
  type AdminExcelColumnDef,
} from "@/lib/admin-excel-utils";

import type { AdminUniversityExportRow } from "./fetch-admin-universities-export";

export const UNIVERSITY_IMPORT_COLUMNS: AdminExcelColumnDef[] = [
  { key: "name", header: "name", width: 28 },
  { key: "country", header: "country", width: 18 },
  { key: "country_code", header: "country_code", width: 12 },
  { key: "city", header: "city", width: 16 },
  { key: "state_region", header: "state_region", width: 16 },
  { key: "type", header: "type", width: 10 },
  { key: "description", header: "description", width: 36 },
  { key: "ranking", header: "ranking", width: 10 },
  { key: "logo_url", header: "logo_url", width: 32 },
  { key: "acceptance_rate", header: "acceptance_rate", width: 14 },
  { key: "intl_students_pct", header: "intl_students_pct", width: 16 },
  { key: "website", header: "website", width: 28 },
  { key: "email", header: "email", width: 26 },
  { key: "phone", header: "phone", width: 16 },
  { key: "admissions_url", header: "admissions_url", width: 28 },
  { key: "address", header: "address", width: 24 },
  { key: "ielts_min", header: "ielts_min", width: 10 },
  { key: "toefl_min", header: "toefl_min", width: 10 },
  { key: "sat_policy", header: "sat_policy", width: 16 },
  { key: "doc_1", header: "doc_1", width: 18 },
  { key: "doc_2", header: "doc_2", width: 18 },
  { key: "doc_3", header: "doc_3", width: 18 },
  { key: "doc_4", header: "doc_4", width: 18 },
  { key: "doc_5", header: "doc_5", width: 18 },
  { key: "deadline_primary", header: "deadline_primary", width: 14 },
  { key: "is_priority", header: "is_priority", width: 12 },
  { key: "application_method", header: "application_method", width: 16 },
  { key: "application_fee", header: "application_fee", width: 14 },
  { key: "intakes", header: "intakes", width: 16 },
  { key: "tuition_amount", header: "tuition_amount", width: 14 },
  { key: "tuition_display", header: "tuition_display", width: 20 },
  { key: "living_cost_annual", header: "living_cost_annual", width: 16 },
  { key: "living_display", header: "living_display", width: 20 },
  { key: "scholarship_note", header: "scholarship_note", width: 24 },
  { key: "difficulty", header: "difficulty", width: 10 },
  { key: "is_active", header: "is_active", width: 10 },
  { key: "prog1_name", header: "prog1_name", width: 18 },
  { key: "prog1_items", header: "prog1_items", width: 28 },
  { key: "prog2_name", header: "prog2_name", width: 18 },
  { key: "prog2_items", header: "prog2_items", width: 28 },
  { key: "prog3_name", header: "prog3_name", width: 18 },
  { key: "prog3_items", header: "prog3_items", width: 28 },
  { key: "prog4_name", header: "prog4_name", width: 18 },
  { key: "prog4_items", header: "prog4_items", width: 28 },
];

export const UNIVERSITY_EXCEL_SAMPLE_ROW: Record<string, string> = {
  name: "Sample University",
  country: "United States",
  country_code: "US",
  city: "Boston",
  state_region: "Massachusetts",
  type: "private",
  description: "A sample private university for import testing",
  ranking: "120",
  logo_url: "https://example.com/logo.png",
  acceptance_rate: "18",
  intl_students_pct: "24",
  website: "https://example.edu",
  email: "admissions@example.edu",
  phone: "+1 555 0100",
  admissions_url: "https://example.edu/admissions",
  address: "123 College Ave",
  ielts_min: "6.5",
  toefl_min: "90",
  sat_policy: "SAT optional",
  doc_1: "Transcript",
  doc_2: "Passport",
  doc_3: "Recommendation letter",
  doc_4: "Personal statement",
  doc_5: "",
  deadline_primary: "2026-01-15",
  is_priority: "false",
  application_method: "Common App",
  application_fee: "75",
  intakes: "Fall,Spring",
  tuition_amount: "52000",
  tuition_display: "$52,000 per year",
  living_cost_annual: "18000",
  living_display: "$18,000 per year",
  scholarship_note: "Merit scholarships available",
  difficulty: "hard",
  is_active: "true",
  prog1_name: "Engineering",
  prog1_items: "Computer Science,Electrical Engineering",
  prog2_name: "Business",
  prog2_items: "Finance,Marketing",
  prog3_name: "Arts",
  prog3_items: "Design,Music",
  prog4_name: "Sciences",
  prog4_items: "Biology,Chemistry",
};

export const UNIVERSITY_EXCEL_SAMPLE_FILENAME = "admin-import-universities-template.xlsx";

function exportRowToRecord(row: AdminUniversityExportRow): Record<string, string> {
  const record: Record<string, string> = {};
  for (const col of UNIVERSITY_IMPORT_COLUMNS) {
    record[col.key] = row[col.key as keyof AdminUniversityExportRow] ?? "";
  }
  return record;
}

export async function buildUniversitiesSampleExcelBuffer(): Promise<ArrayBuffer> {
  return buildStyledAdminWorkbook({
    sheetName: "Universities",
    columns: UNIVERSITY_IMPORT_COLUMNS,
    rows: [UNIVERSITY_EXCEL_SAMPLE_ROW],
    sampleRowIndexes: [0],
  });
}

export async function triggerUniversitiesSampleExcelDownload() {
  const buffer = await buildUniversitiesSampleExcelBuffer();
  triggerExcelDownload(buffer, UNIVERSITY_EXCEL_SAMPLE_FILENAME);
}

export async function buildAdminUniversitiesExcelBuffer(
  rows: AdminUniversityExportRow[],
): Promise<ArrayBuffer> {
  return buildStyledAdminWorkbook({
    sheetName: "Universities",
    columns: UNIVERSITY_IMPORT_COLUMNS,
    rows: rows.map(exportRowToRecord),
  });
}

export async function triggerAdminUniversitiesExcelDownload(
  rows: AdminUniversityExportRow[],
  filename: string,
) {
  const buffer = await buildAdminUniversitiesExcelBuffer(rows);
  triggerExcelDownload(buffer, ensureExcelFilename(filename));
}
