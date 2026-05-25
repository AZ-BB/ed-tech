import type { Json } from "@/database.types";
import {
  buildStyledAdminWorkbook,
  ensureExcelFilename,
  triggerExcelDownload,
  type AdminExcelColumnDef,
} from "@/lib/admin-excel-utils";
import {
  boolToCsv,
  commaListToCsv,
  stringListToNewlineText,
} from "@/lib/admin-csv-utils";

export const ADVISOR_CSV_HEADERS = [
  "email",
  "first_name",
  "last_name",
  "nationality_country_code",
  "specialization_country_codes",
  "tags",
  "phone",
  "title",
  "experience_years",
  "languages",
  "avatar_url",
  "description",
  "best_for",
  "session_for",
  "session_coverage",
  "about",
  "questions",
  "is_active",
] as const;

export const ADVISOR_EXCEL_COLUMNS: AdminExcelColumnDef[] = [
  { key: "email", header: "email", width: 30 },
  { key: "first_name", header: "first_name", width: 14 },
  { key: "last_name", header: "last_name", width: 14 },
  { key: "nationality_country_code", header: "nationality_country_code", width: 22 },
  { key: "specialization_country_codes", header: "specialization_country_codes", width: 26 },
  { key: "tags", header: "tags", width: 28 },
  { key: "phone", header: "phone", width: 18 },
  { key: "title", header: "title", width: 24 },
  { key: "experience_years", header: "experience_years", width: 16 },
  { key: "languages", header: "languages", width: 22 },
  { key: "avatar_url", header: "avatar_url", width: 34 },
  { key: "description", header: "description", width: 36 },
  { key: "best_for", header: "best_for", width: 28 },
  { key: "session_for", header: "session_for", width: 24 },
  { key: "session_coverage", header: "session_coverage", width: 34 },
  { key: "about", header: "about", width: 36 },
  { key: "questions", header: "questions", width: 34 },
  { key: "is_active", header: "is_active", width: 12 },
];

export type AdvisorCsvExportRow = {
  email: string;
  first_name: string;
  last_name: string;
  nationality_country_code: string;
  specialization_country_codes: string[];
  tags: string[];
  phone: string | null;
  title: string | null;
  experience_years: number | null;
  languages: string | null;
  avatar_url: string | null;
  description: string | null;
  best_for: string | null;
  session_for: string | null;
  session_coverage: Json | null;
  about: string | null;
  questions: Json | null;
  is_active: boolean;
};

export const ADVISOR_EXCEL_SAMPLE_ROW: Record<string, string> = {
  email: "omar.advisor@example.com",
  first_name: "Omar",
  last_name: "Mansour",
  nationality_country_code: "LB",
  specialization_country_codes: "US,UK,CA",
  tags: "Scholarships,Essays,Strategy",
  phone: "+961 70 000 000",
  title: "Senior Admissions Advisor",
  experience_years: "8",
  languages: "Arabic,English,French",
  avatar_url: "https://example.com/omar.jpg",
  description: "Advisor specializing in selective university applications",
  best_for: "Students targeting competitive programs",
  session_for: "Undergraduate admissions",
  session_coverage: "University shortlist\nEssay review\nScholarship strategy",
  about: "I help students turn a broad goal into a realistic application plan",
  questions: "What countries are you considering?\nWhat is your current GPA?",
  is_active: "true",
};

export const ADVISOR_EXCEL_SAMPLE_FILENAME = "admin-import-advisors-template.xlsx";

function jsonToStringList(value: Json | null): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return [];
}

export function advisorRowToRecord(row: AdvisorCsvExportRow): Record<string, string> {
  return {
    email: row.email,
    first_name: row.first_name,
    last_name: row.last_name,
    nationality_country_code: row.nationality_country_code,
    specialization_country_codes: commaListToCsv(row.specialization_country_codes),
    tags: commaListToCsv(row.tags),
    phone: row.phone ?? "",
    title: row.title ?? "",
    experience_years: row.experience_years != null ? String(row.experience_years) : "",
    languages: row.languages ?? "",
    avatar_url: row.avatar_url ?? "",
    description: row.description ?? "",
    best_for: row.best_for ?? "",
    session_for: row.session_for ?? "",
    session_coverage: stringListToNewlineText(jsonToStringList(row.session_coverage)),
    about: row.about ?? "",
    questions: stringListToNewlineText(jsonToStringList(row.questions)),
    is_active: boolToCsv(row.is_active),
  };
}

export async function buildAdvisorsExcelBuffer(rows: AdvisorCsvExportRow[]): Promise<ArrayBuffer> {
  return buildStyledAdminWorkbook({
    sheetName: "Advisors",
    columns: ADVISOR_EXCEL_COLUMNS,
    rows: rows.map((row) => advisorRowToRecord(row)),
  });
}

export async function buildAdvisorsSampleExcelBuffer(): Promise<ArrayBuffer> {
  return buildStyledAdminWorkbook({
    sheetName: "Advisors",
    columns: ADVISOR_EXCEL_COLUMNS,
    rows: [ADVISOR_EXCEL_SAMPLE_ROW],
    sampleRowIndexes: [0],
  });
}

export async function triggerAdvisorsExcelDownload(
  rows: AdvisorCsvExportRow[],
  filename: string,
) {
  const buffer = await buildAdvisorsExcelBuffer(rows);
  triggerExcelDownload(buffer, ensureExcelFilename(filename));
}

export async function triggerAdvisorsSampleExcelDownload() {
  const buffer = await buildAdvisorsSampleExcelBuffer();
  triggerExcelDownload(buffer, ADVISOR_EXCEL_SAMPLE_FILENAME);
}
