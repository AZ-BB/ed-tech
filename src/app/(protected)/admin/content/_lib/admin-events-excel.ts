import {
  buildStyledAdminWorkbook,
  ensureExcelFilename,
  triggerExcelDownload,
  type AdminExcelColumnDef,
} from "@/lib/admin-excel-utils";

import type { AdminEventExportRow } from "./fetch-admin-events-export";

export const EVENT_IMPORT_COLUMNS: AdminExcelColumnDef[] = [
  { key: "event_id", header: "event_id", width: 14 },
  { key: "event_name", header: "event_name", width: 28 },
  { key: "event_type", header: "event_type", width: 20 },
  { key: "featured", header: "featured", width: 10 },
  { key: "recommended_tag", header: "recommended_tag", width: 24 },
  { key: "date_start", header: "date_start", width: 14 },
  { key: "date_end", header: "date_end", width: 14 },
  { key: "month", header: "month", width: 12 },
  { key: "year", header: "year", width: 8 },
  { key: "start_time", header: "start_time", width: 10 },
  { key: "end_time", header: "end_time", width: 10 },
  { key: "timezone", header: "timezone", width: 10 },
  { key: "mode", header: "mode", width: 12 },
  { key: "country", header: "country", width: 14 },
  { key: "city", header: "city", width: 16 },
  { key: "venue", header: "venue", width: 24 },
  { key: "region_focus", header: "region_focus", width: 14 },
  { key: "short_description", header: "short_description", width: 36 },
  { key: "full_overview", header: "full_overview", width: 40 },
  { key: "topics_covered", header: "topics_covered", width: 28 },
  { key: "target_audience", header: "target_audience", width: 24 },
  { key: "why_attend", header: "why_attend", width: 28 },
  { key: "universities_attending", header: "universities_attending", width: 28 },
  { key: "university_count", header: "university_count", width: 14 },
  { key: "organizer", header: "organizer", width: 20 },
  { key: "organizer_type", header: "organizer_type", width: 16 },
  { key: "cost", header: "cost", width: 10 },
  { key: "language", header: "language", width: 10 },
  { key: "registration_status", header: "registration_status", width: 18 },
  { key: "registration_required", header: "registration_required", width: 18 },
  { key: "registration_url", header: "registration_url", width: 36 },
  { key: "source_name", header: "source_name", width: 20 },
  { key: "source_url", header: "source_url", width: 36 },
  { key: "date_verified", header: "date_verified", width: 14 },
  { key: "record_status", header: "record_status", width: 12 },
  { key: "internal_notes", header: "internal_notes", width: 28 },
  { key: "prep_steps", header: "prep_steps", width: 36 },
];

export const EVENT_EXCEL_SAMPLE_ROW: Record<string, string> = {
  event_id: "EVT-0001",
  event_name: "Study UK Exhibition – Dubai",
  event_type: "University Fair",
  featured: "No",
  recommended_tag: "Recommended for Grade 12",
  date_start: "2026-10-04",
  date_end: "2026-10-05",
  month: "October",
  year: "2026",
  start_time: "11:00",
  end_time: "17:00",
  timezone: "GST",
  mode: "In-person",
  country: "UAE",
  city: "Dubai",
  venue: "Madinat Jumeirah",
  region_focus: "UK",
  short_description:
    "Meet UK university reps and get UCAS advice at the British Council's flagship fair.",
  full_overview:
    "The British Council's flagship UK fair brings representatives from leading UK universities to Dubai for face-to-face guidance on applications, scholarships and student life.",
  topics_covered: "Admissions; Scholarships; Student Life",
  target_audience: "Grade 11; Grade 12; Parents",
  why_attend:
    "Meet reps directly; Learn about scholarships; Get UCAS guidance",
  universities_attending: "University of Manchester; University of Warwick",
  university_count: "50",
  organizer: "British Council",
  organizer_type: "British Council",
  cost: "Free",
  language: "English",
  registration_status: "Open",
  registration_required: "Yes",
  registration_url: "https://example.com/register",
  source_name: "British Council",
  source_url: "https://example.com",
  date_verified: "2026-07-03",
  record_status: "Active",
  internal_notes: "",
  prep_steps:
    "Register free before the event;Bring predicted grades;Prepare 3–5 questions for reps",
};

export const EVENT_EXCEL_SAMPLE_FILENAME = "admin-import-events-template.xlsx";

function exportRowToRecord(row: AdminEventExportRow): Record<string, string> {
  const record: Record<string, string> = {};
  for (const col of EVENT_IMPORT_COLUMNS) {
    record[col.key] = row[col.key as keyof AdminEventExportRow] ?? "";
  }
  return record;
}

export async function buildEventsSampleExcelBuffer(): Promise<ArrayBuffer> {
  return buildStyledAdminWorkbook({
    sheetName: "Events",
    columns: EVENT_IMPORT_COLUMNS,
    rows: [EVENT_EXCEL_SAMPLE_ROW],
    sampleRowIndexes: [0],
  });
}

export async function triggerEventsSampleExcelDownload() {
  const buffer = await buildEventsSampleExcelBuffer();
  triggerExcelDownload(buffer, EVENT_EXCEL_SAMPLE_FILENAME);
}

export async function buildAdminEventsExcelBuffer(
  rows: AdminEventExportRow[],
): Promise<ArrayBuffer> {
  return buildStyledAdminWorkbook({
    sheetName: "Events",
    columns: EVENT_IMPORT_COLUMNS,
    rows: rows.map(exportRowToRecord),
  });
}

export async function triggerAdminEventsExcelDownload(
  rows: AdminEventExportRow[],
  filename?: string,
) {
  const buffer = await buildAdminEventsExcelBuffer(rows);
  triggerExcelDownload(
    buffer,
    ensureExcelFilename(filename ?? "admin-events-export.xlsx"),
  );
}
