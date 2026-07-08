import {
  buildStyledAdminWorkbook,
  ensureExcelFilename,
  triggerExcelDownload,
  type AdminExcelColumnDef,
} from "@/lib/admin-excel-utils";

import type { AdminInternshipExportRow } from "./fetch-admin-internships-export";

export const INTERNSHIP_IMPORT_COLUMNS: AdminExcelColumnDef[] = [
  { key: "slug", header: "slug", width: 24 },
  { key: "name", header: "name", width: 28 },
  { key: "provider", header: "provider", width: 20 },
  { key: "section", header: "section", width: 12 },
  { key: "country_code", header: "country_code", width: 12 },
  { key: "location_label", header: "location_label", width: 18 },
  { key: "format", header: "format", width: 12 },
  { key: "field", header: "field", width: 16 },
  { key: "pay_tier", header: "pay_tier", width: 10 },
  { key: "pay_label", header: "pay_label", width: 14 },
  { key: "duration", header: "duration", width: 14 },
  { key: "phone", header: "phone", width: 14 },
  { key: "nationals_only", header: "nationals_only", width: 12 },
  { key: "official_url", header: "official_url", width: 36 },
  { key: "url_status", header: "url_status", width: 12 },
  { key: "needs_review", header: "needs_review", width: 12 },
  { key: "is_active", header: "is_active", width: 10 },
  { key: "summary", header: "summary", width: 36 },
  { key: "what_youll_do", header: "what_youll_do", width: 28 },
  { key: "what_youll_gain", header: "what_youll_gain", width: 28 },
  { key: "eligibility", header: "eligibility", width: 28 },
  { key: "how_to_apply", header: "how_to_apply", width: 28 },
];

export const INTERNSHIP_EXCEL_SAMPLE_ROW: Record<string, string> = {
  slug: "sample-tech-internship",
  name: "Sample Tech Internship",
  provider: "Example Corp",
  section: "live",
  country_code: "EG",
  location_label: "Cairo, Egypt",
  format: "hybrid",
  field: "Technology",
  pay_tier: "paid",
  pay_label: "Paid",
  duration: "8–12 weeks",
  phone: "",
  nationals_only: "false",
  official_url: "https://example.com/internships",
  url_status: "deep_link",
  needs_review: "false",
  is_active: "true",
  summary:
    "A hands-on internship for students interested in software and product.",
  what_youll_do:
    "Build features with mentors|Join team standups|Ship a final project",
  what_youll_gain: "Portfolio projects|Mentorship|Reference letter",
  eligibility: "High school or university students; interest in tech.",
  how_to_apply:
    "Apply via the official website form before the posted deadline.",
};

export const INTERNSHIP_EXCEL_SAMPLE_FILENAME =
  "admin-import-internships-template.xlsx";

function exportRowToRecord(
  row: AdminInternshipExportRow,
): Record<string, string> {
  const record: Record<string, string> = {};
  for (const col of INTERNSHIP_IMPORT_COLUMNS) {
    record[col.key] = row[col.key as keyof AdminInternshipExportRow] ?? "";
  }
  return record;
}

export async function buildInternshipsSampleExcelBuffer(): Promise<ArrayBuffer> {
  return buildStyledAdminWorkbook({
    sheetName: "Internships",
    columns: INTERNSHIP_IMPORT_COLUMNS,
    rows: [INTERNSHIP_EXCEL_SAMPLE_ROW],
    sampleRowIndexes: [0],
  });
}

export async function triggerInternshipsSampleExcelDownload() {
  const buffer = await buildInternshipsSampleExcelBuffer();
  triggerExcelDownload(buffer, INTERNSHIP_EXCEL_SAMPLE_FILENAME);
}

export async function buildAdminInternshipsExcelBuffer(
  rows: AdminInternshipExportRow[],
): Promise<ArrayBuffer> {
  return buildStyledAdminWorkbook({
    sheetName: "Internships",
    columns: INTERNSHIP_IMPORT_COLUMNS,
    rows: rows.map(exportRowToRecord),
  });
}

export async function triggerAdminInternshipsExcelDownload(
  rows: AdminInternshipExportRow[],
  filename: string,
) {
  const buffer = await buildAdminInternshipsExcelBuffer(rows);
  triggerExcelDownload(buffer, ensureExcelFilename(filename));
}
