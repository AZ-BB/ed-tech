import {
  buildStyledAdminWorkbook,
  ensureExcelFilename,
  triggerExcelDownload,
  type AdminExcelColumnDef,
} from "@/lib/admin-excel-utils";

import type { AdminSchoolExportRow } from "./fetch-admin-schools-export";

export const ADMIN_SCHOOLS_EXCEL_COLUMNS: AdminExcelColumnDef[] = [
  { key: "name", header: "School Name", width: 28 },
  { key: "code", header: "Code", width: 14 },
  { key: "city", header: "City", width: 18 },
  { key: "country", header: "Country", width: 18 },
  { key: "contactEmail", header: "Contact Email", width: 28 },
  { key: "studentsCount", header: "Students", width: 12 },
  { key: "studentsLimit", header: "Students Limit", width: 14 },
  { key: "teachersCount", header: "Teachers", width: 12 },
  { key: "creditPool", header: "Credit Pool", width: 14 },
  { key: "yearlyCreditPlan", header: "Yearly Credit Plan", width: 18 },
  { key: "tokenPercent", header: "Token %", width: 10 },
  { key: "accessStatus", header: "Access Status", width: 14 },
  { key: "subscriptionStatus", header: "Subscription", width: 14 },
  { key: "ownerName", header: "Owner", width: 20 },
  { key: "renewalDate", header: "Renewal Date", width: 16 },
  { key: "createdAt", header: "Created", width: 16 },
];

function schoolRowToRecord(row: AdminSchoolExportRow): Record<string, string> {
  return {
    name: row.name,
    code: row.code,
    city: row.city,
    country: row.country,
    contactEmail: row.contactEmail,
    studentsCount: String(row.studentsCount),
    studentsLimit: row.studentsLimit,
    teachersCount: String(row.teachersCount),
    creditPool: row.creditPool,
    yearlyCreditPlan: row.yearlyCreditPlan,
    tokenPercent: row.tokenPercent,
    accessStatus: row.accessStatus,
    subscriptionStatus: row.subscriptionStatus,
    ownerName: row.ownerName,
    renewalDate: row.renewalDate,
    createdAt: row.createdAt,
  };
}

export async function buildAdminSchoolsExcelBuffer(
  rows: AdminSchoolExportRow[],
): Promise<ArrayBuffer> {
  return buildStyledAdminWorkbook({
    sheetName: "Schools",
    columns: ADMIN_SCHOOLS_EXCEL_COLUMNS,
    rows: rows.map(schoolRowToRecord),
  });
}

export async function triggerAdminSchoolsExcelDownload(
  rows: AdminSchoolExportRow[],
  filename: string,
) {
  const buffer = await buildAdminSchoolsExcelBuffer(rows);
  triggerExcelDownload(buffer, ensureExcelFilename(filename));
}
