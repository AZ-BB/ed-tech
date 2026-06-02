import type jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import type { AdminReportMeta } from "../report-types";
import type { RankedCount } from "../report-types";

export const MARGIN_MM = 14;
export const PAGE_W_MM = 210;
export const TEXT_W_MM = PAGE_W_MM - MARGIN_MM * 2;
export const SECTION_GAP_MM = 5;

export const BRAND = {
  primary: [45, 106, 79] as [number, number, number],
  primaryDark: [27, 67, 50] as [number, number, number],
  border: [236, 233, 228] as [number, number, number],
  surface: [240, 247, 242] as [number, number, number],
  muted: [106, 106, 106] as [number, number, number],
  text: [26, 26, 26] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

export const COMPACT_TABLE = {
  theme: "grid" as const,
  styles: {
    font: "helvetica",
    fontSize: 8,
    cellPadding: 2,
    lineColor: BRAND.border,
    lineWidth: 0.1,
    textColor: BRAND.text,
  },
  headStyles: {
    fillColor: BRAND.primary,
    textColor: BRAND.white,
    fontSize: 8,
    fontStyle: "bold" as const,
  },
};

type DocWithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } };

export function lineHeightMm(doc: jsPDF, fontSize: number): number {
  return (fontSize * doc.getLineHeightFactor()) / 2.83465;
}

export function lastTableY(doc: jsPDF): number | undefined {
  return (doc as DocWithAutoTable).lastAutoTable?.finalY;
}

export function ensureSpace(
  doc: jsPDF,
  y: number,
  minBottomMm: number,
): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + minBottomMm > pageH - MARGIN_MM) {
    doc.addPage();
    return MARGIN_MM;
  }
  return y;
}

export function drawWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  color: [number, number, number] = BRAND.text,
): number {
  doc.setTextColor(...color);
  doc.setFontSize(fontSize);
  const lh = lineHeightMm(doc, fontSize);
  const lines = doc.splitTextToSize(text, maxWidth);
  const pageH = doc.internal.pageSize.getHeight();
  let cy = y;
  for (const line of lines) {
    if (cy + lh > pageH - MARGIN_MM) {
      doc.addPage();
      cy = MARGIN_MM;
    }
    doc.text(line, x, cy);
    cy += lh;
  }
  doc.setTextColor(...BRAND.text);
  return cy;
}

export function sectionTitle(
  doc: jsPDF,
  label: string,
  x: number,
  y: number,
): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.primaryDark);
  doc.text(label.toUpperCase(), x, y);
  return y + lineHeightMm(doc, 9) + 2;
}

export function drawAdminReportHeader(
  doc: jsPDF,
  meta: AdminReportMeta,
  y: number,
): number {
  const title = `${meta.reportTypeLabel} — ${meta.schoolName}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BRAND.text);
  y = drawWrapped(doc, title, MARGIN_MM, y, TEXT_W_MM, 14);
  y += 1;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.muted);
  y = drawWrapped(
    doc,
    meta.rangeLabel,
    MARGIN_MM,
    y,
    TEXT_W_MM,
    9,
    BRAND.muted,
  );
  doc.setTextColor(...BRAND.text);
  return y + SECTION_GAP_MM;
}

export function drawStatCards(
  doc: jsPDF,
  metrics: { value: number | string; label: string }[],
  y: number,
): number {
  const n = Math.min(metrics.length, 4);
  const gap = 3;
  const cardW = (TEXT_W_MM - gap * (n - 1)) / n;
  const cardH = 18;
  y = ensureSpace(doc, y, cardH + 2);
  for (let i = 0; i < n; i++) {
    const x = MARGIN_MM + i * (cardW + gap);
    const m = metrics[i];
    doc.setFillColor(...BRAND.surface);
    doc.setDrawColor(...BRAND.border);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...BRAND.primaryDark);
    const val =
      typeof m.value === "number" ? m.value.toLocaleString() : m.value;
    doc.text(String(val), x + 4, y + 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.muted);
    const labelLines = doc.splitTextToSize(m.label, cardW - 8);
    doc.text(labelLines, x + 4, y + 14);
  }
  doc.setTextColor(...BRAND.text);
  return y + cardH + SECTION_GAP_MM;
}

export function drawRankedTable(
  doc: jsPDF,
  title: string,
  rows: RankedCount[],
  y: number,
  valueSuffix = "",
): number {
  y = ensureSpace(doc, y, 20);
  y = sectionTitle(doc, title, MARGIN_MM, y);
  const body =
    rows.length === 0
      ? [["—", "0"]]
      : rows.map((r) => [
          r.label,
          `${r.count.toLocaleString()}${valueSuffix}`,
        ]);
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN_MM, right: MARGIN_MM },
    head: [["Item", "Count"]],
    body,
    ...COMPACT_TABLE,
  });
  return (lastTableY(doc) ?? y) + SECTION_GAP_MM;
}

export function drawHorizontalBarChart(
  doc: jsPDF,
  title: string,
  items: { label: string; value: number }[],
  y: number,
  maxBars = 12,
): number {
  y = ensureSpace(doc, y, 24);
  y = sectionTitle(doc, title, MARGIN_MM, y);
  const slice = items.slice(0, maxBars);
  if (slice.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.muted);
    doc.text("No data in this period.", MARGIN_MM, y + 4);
    doc.setTextColor(...BRAND.text);
    return y + 10;
  }
  const maxVal = Math.max(...slice.map((i) => i.value), 1);
  const barMaxW = TEXT_W_MM - 52;
  const rowH = 7;
  let cy = y + 2;
  for (const item of slice) {
    cy = ensureSpace(doc, cy, rowH + 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.muted);
    const label =
      item.label.length > 28 ? `${item.label.slice(0, 26)}…` : item.label;
    doc.text(label, MARGIN_MM, cy + 4);
    const barX = MARGIN_MM + 50;
    const barW = (item.value / maxVal) * barMaxW;
    doc.setFillColor(...BRAND.primary);
    doc.rect(barX, cy, Math.max(barW, 1), 5, "F");
    doc.setTextColor(...BRAND.text);
    doc.setFontSize(7);
    doc.text(String(item.value.toLocaleString()), barX + barMaxW + 2, cy + 4);
    cy += rowH;
  }
  return cy + SECTION_GAP_MM;
}

export function adminReportFilename(meta: AdminReportMeta): string {
  const school = meta.schoolId
    ? meta.schoolName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()
    : "all-schools";
  return `uniapply-${meta.reportType}-${school}-${meta.startDate}-${meta.endDate}.pdf`;
}
