import type { Json } from "@/database.types";
import {
  buildStyledAdminWorkbook,
  ensureExcelFilename,
  triggerExcelDownload,
  type AdminExcelColumnDef,
} from "@/lib/admin-excel-utils";
import {
  boolToCsv,
  stringListToNewlineText,
} from "@/lib/admin-csv-utils";

export const AMBASSADOR_CSV_HEADERS = [
  "email",
  "first_name",
  "last_name",
  "destination_country_code",
  "nationality_country_code",
  "university_id",
  "university_name",
  "avatar_url",
  "start_year",
  "graduation_year",
  "is_current_student",
  "major",
  "has_msc",
  "has_phd",
  "about",
  "help_in",
  "tags",
  "is_active",
] as const;

export const AMBASSADOR_EXCEL_COLUMNS: AdminExcelColumnDef[] = [
  { key: "email", header: "email", width: 30 },
  { key: "first_name", header: "first_name", width: 14 },
  { key: "last_name", header: "last_name", width: 14 },
  { key: "destination_country_code", header: "destination_country_code", width: 22 },
  { key: "nationality_country_code", header: "nationality_country_code", width: 22 },
  { key: "university_id", header: "university_id", width: 38 },
  { key: "university_name", header: "university_name", width: 24 },
  { key: "avatar_url", header: "avatar_url", width: 34 },
  { key: "start_year", header: "start_year", width: 12 },
  { key: "graduation_year", header: "graduation_year", width: 14 },
  { key: "is_current_student", header: "is_current_student", width: 18 },
  { key: "major", header: "major", width: 20 },
  { key: "has_msc", header: "has_msc", width: 10 },
  { key: "has_phd", header: "has_phd", width: 10 },
  { key: "about", header: "about", width: 40 },
  { key: "help_in", header: "help_in", width: 34 },
  { key: "tags", header: "tags", width: 30 },
  { key: "is_active", header: "is_active", width: 12 },
];

export type AmbassadorCsvExportRow = {
  email: string;
  first_name: string;
  last_name: string;
  destination_country_code: string;
  nationality_country_code: string;
  university_id: string | null;
  university_name: string | null;
  avatar_url: string | null;
  start_year: number | null;
  graduation_year: number | null;
  is_current_student: boolean;
  major: string | null;
  has_msc: boolean;
  has_phd: boolean;
  about: string | null;
  help_in: Json | null;
  tags: string[];
  is_active: boolean;
};

export const AMBASSADOR_EXCEL_SAMPLE_ROW: Record<string, string> = {
  email: "layla.ambassador@example.com",
  first_name: "Layla",
  last_name: "Haddad",
  destination_country_code: "US",
  nationality_country_code: "LB",
  university_id: "",
  university_name: "Sample University",
  avatar_url: "https://example.com/layla.jpg",
  start_year: "2023",
  graduation_year: "2027",
  is_current_student: "true",
  major: "Computer Science",
  has_msc: "false",
  has_phd: "false",
  about: "Current CS student helping applicants understand campus life",
  help_in: "Applications\nCampus life\nHousing",
  tags: "STEM\nFirst year\nInternational student",
  is_active: "true",
};

export const AMBASSADOR_EXCEL_SAMPLE_FILENAME = "admin-import-ambassadors-template.xlsx";

function jsonToStringList(value: Json | null): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return [];
}

export function ambassadorRowToRecord(row: AmbassadorCsvExportRow): Record<string, string> {
  return {
    email: row.email,
    first_name: row.first_name,
    last_name: row.last_name,
    destination_country_code: row.destination_country_code,
    nationality_country_code: row.nationality_country_code,
    university_id: row.university_id ?? "",
    university_name: row.university_name ?? "",
    avatar_url: row.avatar_url ?? "",
    start_year: row.start_year != null ? String(row.start_year) : "",
    graduation_year: row.graduation_year != null ? String(row.graduation_year) : "",
    is_current_student: boolToCsv(row.is_current_student),
    major: row.major ?? "",
    has_msc: boolToCsv(row.has_msc),
    has_phd: boolToCsv(row.has_phd),
    about: row.about ?? "",
    help_in: stringListToNewlineText(jsonToStringList(row.help_in)),
    tags: stringListToNewlineText(row.tags),
    is_active: boolToCsv(row.is_active),
  };
}

export async function buildAmbassadorsExcelBuffer(
  rows: AmbassadorCsvExportRow[],
): Promise<ArrayBuffer> {
  return buildStyledAdminWorkbook({
    sheetName: "Ambassadors",
    columns: AMBASSADOR_EXCEL_COLUMNS,
    rows: rows.map((row) => ambassadorRowToRecord(row)),
  });
}

export async function buildAmbassadorsSampleExcelBuffer(): Promise<ArrayBuffer> {
  return buildStyledAdminWorkbook({
    sheetName: "Ambassadors",
    columns: AMBASSADOR_EXCEL_COLUMNS,
    rows: [AMBASSADOR_EXCEL_SAMPLE_ROW],
    sampleRowIndexes: [0],
  });
}

export async function triggerAmbassadorsExcelDownload(
  rows: AmbassadorCsvExportRow[],
  filename: string,
) {
  const buffer = await buildAmbassadorsExcelBuffer(rows);
  triggerExcelDownload(buffer, ensureExcelFilename(filename));
}

export async function triggerAmbassadorsSampleExcelDownload() {
  const buffer = await buildAmbassadorsSampleExcelBuffer();
  triggerExcelDownload(buffer, AMBASSADOR_EXCEL_SAMPLE_FILENAME);
}
