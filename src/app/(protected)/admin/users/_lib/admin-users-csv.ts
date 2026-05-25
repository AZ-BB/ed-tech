import { csvCell, rowsToCsvLines, triggerCsvDownload } from "@/lib/admin-csv-utils";

import type { AdminUserTableRow } from "../_lib/fetch-admin-users-page";

const CSV_HEADERS = [
  "First name",
  "Last name",
  "Email",
  "Role",
  "School",
  "Last active",
  "Joined",
] as const;

function userCsvCell(raw: string | null | undefined): string {
  const text = raw?.trim() ?? "";
  if (!text || text === "—") return csvCell("-");
  return csvCell(text);
}

export function adminUserRowsToCsvLines(rows: AdminUserTableRow[]): string[] {
  return rowsToCsvLines(
    CSV_HEADERS,
    rows.map((row) => [
      userCsvCell(row.firstName),
      userCsvCell(row.lastName),
      userCsvCell(row.email),
      userCsvCell(row.role),
      userCsvCell(row.school),
      userCsvCell(row.lastActiveLabel),
      userCsvCell(row.joinedLabel),
    ]),
  );
}

export function triggerAdminUsersCsvDownload(
  rows: AdminUserTableRow[],
  filename: string,
) {
  triggerCsvDownload(adminUserRowsToCsvLines(rows), filename);
}
