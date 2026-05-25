import ExcelJS from "exceljs";

export type AdminExcelColumnDef = {
  key: string;
  header: string;
  width: number;
};

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF2D6A4F" },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  size: 11,
};

const SAMPLE_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF5F3F0" },
};

export async function buildStyledAdminWorkbook(options: {
  sheetName: string;
  columns: AdminExcelColumnDef[];
  rows: Record<string, string>[];
  sampleRowIndexes?: number[];
}): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Univeera Admin";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(options.sheetName, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = options.columns.map((column) => ({
    key: column.key,
    header: column.header,
    width: column.width,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF1B4332" } },
    };
  });

  const sampleIndexes = new Set(options.sampleRowIndexes ?? []);

  for (let rowIndex = 0; rowIndex < options.rows.length; rowIndex++) {
    const values = options.columns.map((column) => options.rows[rowIndex]?.[column.key] ?? "");
    const row = sheet.addRow(values);
    row.alignment = { vertical: "top", wrapText: true };

    if (sampleIndexes.has(rowIndex)) {
      row.eachCell((cell) => {
        cell.fill = SAMPLE_FILL;
        cell.font = { italic: true, color: { argb: "FF666666" } };
      });
    }
  }

  const lastRow = Math.max(1, options.rows.length + 1);
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: lastRow, column: options.columns.length },
  };

  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
}

export function triggerExcelDownload(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ensureExcelFilename(filename: string): string {
  if (filename.toLowerCase().endsWith(".xlsx")) return filename;
  return `${filename.replace(/\.csv$/i, "")}.xlsx`;
}

export function isExcelFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xls");
}
