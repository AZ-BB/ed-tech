import "server-only";

import ExcelJS from "exceljs";
import { Buffer } from "node:buffer";

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }
    if ("result" in value && value.result != null) {
      return cellToString(value.result as ExcelJS.CellValue);
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
  }
  return String(value);
}

export async function parseExcelFirstSheetToRecords(
  buffer: ArrayBuffer,
): Promise<Record<string, string>[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(buffer) as unknown as ExcelJS.Buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];

  headerRow.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
    headers[columnNumber - 1] = cellToString(cell.value).trim();
  });

  const records: Record<string, string>[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const record: Record<string, string> = {};
    let hasData = false;

    for (let columnIndex = 0; columnIndex < headers.length; columnIndex++) {
      const header = headers[columnIndex];
      if (!header) continue;

      const value = cellToString(row.getCell(columnIndex + 1).value).trim();
      if (value) hasData = true;
      record[header] = value;
    }

    if (hasData) {
      records.push(record);
    }
  });

  return records;
}

export async function parseExcelAllSheetsToRecords(
  buffer: ArrayBuffer,
): Promise<Record<string, Record<string, string>[]>> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(buffer) as unknown as ExcelJS.Buffer);

  const sheets: Record<string, Record<string, string>[]> = {};

  for (const sheet of workbook.worksheets) {
    const sheetName = sheet.name.trim();
    if (!sheetName) continue;

    const headerRow = sheet.getRow(1);
    const headers: string[] = [];

    headerRow.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
      headers[columnNumber - 1] = cellToString(cell.value).trim();
    });

    const records: Record<string, string>[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const record: Record<string, string> = {};
      let hasData = false;

      for (let columnIndex = 0; columnIndex < headers.length; columnIndex++) {
        const header = headers[columnIndex];
        if (!header) continue;

        const value = cellToString(row.getCell(columnIndex + 1).value).trim();
        if (value) hasData = true;
        record[header] = value;
      }

      if (hasData) {
        records.push(record);
      }
    });

    sheets[sheetName] = records;
  }

  return sheets;
}
