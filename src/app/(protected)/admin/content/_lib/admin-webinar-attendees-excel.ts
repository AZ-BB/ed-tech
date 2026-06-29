import {
  buildStyledAdminWorkbook,
  ensureExcelFilename,
  triggerExcelDownload,
  type AdminExcelColumnDef,
} from "@/lib/admin-excel-utils";

import type { AdminWebinarAttendeeExportRow } from "./fetch-admin-webinar-attendees-export";

export const WEBINAR_ATTENDEE_EXPORT_COLUMNS: AdminExcelColumnDef[] = [
  { key: "type", header: "Type", width: 16 },
  { key: "name", header: "Name", width: 24 },
  { key: "email", header: "Email", width: 28 },
  { key: "phone", header: "Phone", width: 18 },
  { key: "school", header: "School", width: 24 },
  { key: "registered_at", header: "Registered", width: 22 },
  { key: "reminder_sent_at", header: "Reminder sent", width: 22 },
  { key: "meeting_link_sent_at", header: "Link sent", width: 22 },
];

function exportRowToRecord(row: AdminWebinarAttendeeExportRow): Record<string, string> {
  return {
    type: row.type,
    name: row.name,
    email: row.email,
    phone: row.phone,
    school: row.school,
    registered_at: row.registered_at,
    reminder_sent_at: row.reminder_sent_at,
    meeting_link_sent_at: row.meeting_link_sent_at,
  };
}

export async function buildAdminWebinarAttendeesExcelBuffer(
  rows: AdminWebinarAttendeeExportRow[],
): Promise<ArrayBuffer> {
  return buildStyledAdminWorkbook({
    sheetName: "Attendees",
    columns: WEBINAR_ATTENDEE_EXPORT_COLUMNS,
    rows: rows.map(exportRowToRecord),
  });
}

export async function triggerAdminWebinarAttendeesExcelDownload(
  rows: AdminWebinarAttendeeExportRow[],
  filename: string,
) {
  const buffer = await buildAdminWebinarAttendeesExcelBuffer(rows);
  triggerExcelDownload(buffer, ensureExcelFilename(filename));
}
