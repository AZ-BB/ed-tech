import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import type { SchoolReportsPayload } from "./fetch-school-reports";

const MARGIN_MM = 14;
const PAGE_W_MM = 210;
const TEXT_W_MM = PAGE_W_MM - MARGIN_MM * 2;
const SECTION_GAP_MM = 5;
const COL_GAP_MM = 4;

const BRAND = {
  primary: [45, 106, 79] as [number, number, number],
  primaryDark: [27, 67, 50] as [number, number, number],
  border: [236, 233, 228] as [number, number, number],
  surface: [240, 247, 242] as [number, number, number],
  surfaceAlt: [250, 249, 244] as [number, number, number],
  muted: [106, 106, 106] as [number, number, number],
  text: [26, 26, 26] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const COMPACT_TABLE = {
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

type DocWithAutoTable = jsPDF & {
  lastAutoTable?: { finalY: number };
};

type RankedRow = { label: string; count: number };

function lineHeightMm(doc: jsPDF, fontSize: number): number {
  return (fontSize * doc.getLineHeightFactor()) / 2.83465;
}

function lastTableY(doc: jsPDF): number | undefined {
  return (doc as DocWithAutoTable).lastAutoTable?.finalY;
}

function ensureSpace(doc: jsPDF, y: number, minBottomMm: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + minBottomMm > pageH - MARGIN_MM) {
    doc.addPage();
    return MARGIN_MM;
  }
  return y;
}

function drawWrapped(
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

function sectionTitle(doc: jsPDF, label: string, x: number, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.primaryDark);
  doc.text(label.toUpperCase(), x, y);
  return y + lineHeightMm(doc, 9) + 2;
}

function drawContinuationHeader(
  doc: jsPDF,
  schoolName: string,
  monthLabel: string,
): void {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.primaryDark);
  doc.text(schoolName, MARGIN_MM, 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.muted);
  doc.text(`Monthly snapshot · ${monthLabel}`, MARGIN_MM, 10);
  doc.setTextColor(...BRAND.text);
}

function drawReportHeader(
  doc: jsPDF,
  data: SchoolReportsPayload,
  y: number,
): number {
  const title = `${data.schoolName} — University Guidance Report`;
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
    `Monthly snapshot · ${data.monthLabel}`,
    MARGIN_MM,
    y,
    TEXT_W_MM,
    9,
    BRAND.muted,
  );
  doc.setTextColor(...BRAND.text);
  return y + SECTION_GAP_MM;
}

function drawStatCards(
  doc: jsPDF,
  metrics: { value: number; label: string }[],
  y: number,
): number {
  const gap = 3;
  const cardW = (TEXT_W_MM - gap * (metrics.length - 1)) / metrics.length;
  const cardH = 18;

  y = ensureSpace(doc, y, cardH + 2);

  for (let i = 0; i < metrics.length; i++) {
    const x = MARGIN_MM + i * (cardW + gap);
    const m = metrics[i];

    doc.setFillColor(...BRAND.surface);
    doc.setDrawColor(...BRAND.border);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...BRAND.primaryDark);
    doc.text(String(m.value), x + 4, y + 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.muted);
    const labelLines = doc.splitTextToSize(m.label, cardW - 8);
    doc.text(labelLines, x + 4, y + 14);
  }

  doc.setTextColor(...BRAND.text);
  return y + cardH + SECTION_GAP_MM;
}

function rankedRowsToBody(rows: RankedRow[]): string[][] {
  if (rows.length === 0) {
    return [["—", "0 students"]];
  }
  return rows.map((r) => [
    r.label,
    `${r.count} student${r.count === 1 ? "" : "s"}`,
  ]);
}

function drawKeyValueTable(
  doc: jsPDF,
  rows: RankedRow[],
  x: number,
  width: number,
  startY: number,
): number {
  autoTable(doc, {
    startY,
    margin: { left: x, right: PAGE_W_MM - x - width },
    tableWidth: width,
    body: rankedRowsToBody(rows),
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 0 },
      textColor: BRAND.text,
      lineWidth: 0,
    },
    columnStyles: {
      0: { textColor: BRAND.muted },
      1: { halign: "right", fontStyle: "bold" },
    },
  });
  return lastTableY(doc) ?? startY;
}

function drawTwoColumnRanked(
  doc: jsPDF,
  destinations: RankedRow[],
  programs: RankedRow[],
  y: number,
): number {
  const colW = (TEXT_W_MM - COL_GAP_MM) / 2;
  const rightX = MARGIN_MM + colW + COL_GAP_MM;

  y = ensureSpace(doc, y, 28);
  const labelY = y;
  sectionTitle(doc, "Top destinations", MARGIN_MM, labelY);
  sectionTitle(doc, "Top programs", rightX, labelY);
  const tableY = labelY + lineHeightMm(doc, 9) + 4;

  const destEndY = drawKeyValueTable(
    doc,
    destinations,
    MARGIN_MM,
    colW,
    tableY,
  );
  const progEndY = drawKeyValueTable(doc, programs, rightX, colW, tableY);

  return Math.max(destEndY, progEndY) + SECTION_GAP_MM;
}

function drawEngagementLine(doc: jsPDF, data: SchoolReportsPayload, y: number): number {
  y = ensureSpace(doc, y, 12);
  const text = `Engagement: ${data.advisorSessionsMonth} advisor sessions · ${data.ambassadorSessionsMonth} ambassador conversations · ${data.essayReviewsMonth} essay reviews · ${data.webinarsMonth} webinars`;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.muted);
  y = drawWrapped(doc, text, MARGIN_MM, y, TEXT_W_MM, 9, BRAND.muted);
  doc.setTextColor(...BRAND.text);
  return y + SECTION_GAP_MM;
}

function outcomeStudentName(
  o: SchoolReportsPayload["outcomes"][number],
): string {
  return [o.firstName, o.lastName].filter(Boolean).join(" ") || "—";
}

function attentionStudentName(
  s: SchoolReportsPayload["attentionStudents"][number],
): string {
  return [s.firstName, s.lastName].filter(Boolean).join(" ") || "—";
}

function drawOutcomesSection(
  doc: jsPDF,
  data: SchoolReportsPayload,
  y: number,
): number {
  y = ensureSpace(doc, y, 30);
  y = sectionTitle(doc, "Student outcomes", MARGIN_MM, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.muted);
  y = drawWrapped(
    doc,
    `${data.outcomes.length} graduating student${data.outcomes.length === 1 ? "" : "s"} in scope. Destinations, programs, application progress, and profile completion.`,
    MARGIN_MM,
    y,
    TEXT_W_MM,
    8,
    BRAND.muted,
  );
  doc.setTextColor(...BRAND.text);
  y += 3;

  y = ensureSpace(doc, y, 40);
  const outcomesStartPage = doc.getNumberOfPages();

  const head = [["Student", "Destination", "Programs", "Apps", "Profile"]];
  const body = data.outcomes.map((o) => [
    outcomeStudentName(o),
    o.destinationsSummary,
    o.programsSummary,
    `${o.applicationsSubmitted}/${o.applicationsTotal}`,
    `${o.profilePercent}%`,
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN_MM, right: MARGIN_MM },
    head,
    body: body.length > 0 ? body : [["—", "—", "—", "—", "—"]],
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 1.5,
      overflow: "linebreak",
      lineColor: BRAND.border,
      lineWidth: 0.1,
      textColor: BRAND.text,
    },
    headStyles: {
      fillColor: BRAND.primary,
      textColor: BRAND.white,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: BRAND.surfaceAlt,
    },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 50 },
      2: { cellWidth: 50 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
    },
    showHead: "everyPage",
    tableWidth: TEXT_W_MM,
    didDrawPage: (hookData) => {
      if (hookData.pageNumber > outcomesStartPage) {
        drawContinuationHeader(doc, data.schoolName, data.monthLabel);
      }
    },
  });

  return (lastTableY(doc) ?? y) + SECTION_GAP_MM;
}

function drawAppendixSplit(doc: jsPDF, data: SchoolReportsPayload, y: number): number {
  const leftW = TEXT_W_MM * 0.52;
  const rightW = TEXT_W_MM - leftW - COL_GAP_MM;
  const rightX = MARGIN_MM + leftW + COL_GAP_MM;
  const minBlockH = 55;

  y = ensureSpace(doc, y, minBlockH);
  const blockTop = y;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.text);
  doc.text("Engagement summary", MARGIN_MM, blockTop);
  doc.text("Students at risk", rightX, blockTop);
  const tableY = blockTop + 6;

  const engagementHead = [["Metric", "Count"]];
  const engagementBody = [
    ["Advisor sessions booked", String(data.advisorSessionsMonth)],
    ["Ambassador sessions booked", String(data.ambassadorSessionsMonth)],
    ["Essays / documents reviewed", String(data.essayReviewsMonth)],
    ["Webinars attended", String(data.webinarsMonth)],
    ["Universities shortlisted", String(data.universitiesShortlistedMonth)],
  ];

  autoTable(doc, {
    ...COMPACT_TABLE,
    startY: tableY,
    margin: { left: MARGIN_MM, right: PAGE_W_MM - MARGIN_MM - leftW },
    tableWidth: leftW,
    head: engagementHead,
    body: engagementBody,
    columnStyles: {
      1: { halign: "right", fontStyle: "bold" },
    },
  });
  const leftEndY = lastTableY(doc) ?? tableY;

  const riskBody =
    data.attentionStudents.length === 0
      ? [["No students flagged this cycle.", "", ""]]
      : data.attentionStudents.map((s) => [
          attentionStudentName(s),
          s.issue,
          s.riskClass === "red" ? "Urgent" : "Follow-up",
        ]);

  autoTable(doc, {
    ...COMPACT_TABLE,
    startY: tableY,
    margin: { left: rightX, right: MARGIN_MM },
    tableWidth: rightW,
    head: [["Student", "Issue", "Status"]],
    body: riskBody,
    columnStyles: {
      2: { halign: "center" },
    },
    didParseCell: (hook) => {
      if (
        hook.section === "body" &&
        hook.column.index === 2 &&
        data.attentionStudents.length > 0
      ) {
        const status = hook.cell.raw as string;
        if (status === "Urgent") {
          hook.cell.styles.textColor = [140, 45, 34];
          hook.cell.styles.fontStyle = "bold";
        } else if (status === "Follow-up") {
          hook.cell.styles.textColor = [122, 93, 16];
          hook.cell.styles.fontStyle = "bold";
        }
      }
      if (
        data.attentionStudents.length === 0 &&
        hook.section === "body" &&
        hook.column.index === 0
      ) {
        hook.cell.colSpan = 3;
        hook.cell.styles.textColor = BRAND.muted;
        hook.cell.styles.fontStyle = "normal";
      }
    },
  });
  const rightEndY = lastTableY(doc) ?? tableY;

  return Math.max(leftEndY, rightEndY) + SECTION_GAP_MM;
}

function drawFooter(doc: jsPDF, y: number): void {
  y = ensureSpace(doc, y, 10);
  drawWrapped(
    doc,
    "",
    MARGIN_MM,
    y,
    TEXT_W_MM,
    7,
    BRAND.muted,
  );
  doc.setTextColor(...BRAND.text);
}

/**
 * Builds a text-based monthly school guidance report PDF (selectable text, not a screenshot).
 */
export function buildSchoolReportPdf(data: SchoolReportsPayload): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  doc.setFont("helvetica", "normal");

  let y = MARGIN_MM;

  y = drawReportHeader(doc, data, y);

  y = drawStatCards(doc, [
    { value: data.totalStudents, label: "Total students" },
    { value: data.activeStudentsMonth, label: "Active this month" },
    { value: data.needAttentionCount, label: "Need attention" },
    { value: data.appsSubmittedMonth, label: "Apps submitted" },
  ], y);

  y = drawTwoColumnRanked(doc, data.topDestinations, data.topPrograms, y);
  y = drawEngagementLine(doc, data, y);

  y = drawOutcomesSection(doc, data, y);
  y = drawAppendixSplit(doc, data, y);
  drawFooter(doc, y);

  return doc;
}
