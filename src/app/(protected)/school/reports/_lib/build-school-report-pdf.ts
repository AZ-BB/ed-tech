import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import type { SchoolReportsPayload } from "./fetch-school-reports";

const MARGIN_MM = 14;
const PAGE_W_MM = 210;
const TEXT_W_MM = PAGE_W_MM - MARGIN_MM * 2;

type DocWithAutoTable = jsPDF & {
  lastAutoTable?: { finalY: number };
};

function lineHeightMm(doc: jsPDF, fontSize: number): number {
  return (fontSize * doc.getLineHeightFactor()) / 2.83465;
}

function drawWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
): number {
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
  return cy;
}

function ensureSpace(doc: jsPDF, y: number, minBottomMm: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + minBottomMm > pageH - MARGIN_MM) {
    doc.addPage();
    return MARGIN_MM;
  }
  return y;
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

/**
 * Builds a text-based monthly school guidance report PDF (selectable text, not a screenshot).
 */
export function buildSchoolReportPdf(data: SchoolReportsPayload): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  doc.setFont("helvetica", "normal");

  let y = MARGIN_MM;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const title = `${data.schoolName} — University Guidance Report`;
  y = drawWrapped(doc, title, MARGIN_MM, y, TEXT_W_MM, 16);
  y += 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y = drawWrapped(
    doc,
    `Monthly snapshot · ${data.monthLabel} (${data.monthKey})`,
    MARGIN_MM,
    y,
    TEXT_W_MM,
    10,
  );
  y += 4;

  y = ensureSpace(doc, y, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Summary", MARGIN_MM, y);
  y += lineHeightMm(doc, 12) + 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const summaryLines = [
    `Total students: ${data.totalStudents}`,
    `Active this month: ${data.activeStudentsMonth}`,
    `Need attention: ${data.needAttentionCount}`,
    `Applications submitted (month): ${data.appsSubmittedMonth}`,
  ];
  for (const line of summaryLines) {
    y = ensureSpace(doc, y, 8);
    doc.text(line, MARGIN_MM, y);
    y += lineHeightMm(doc, 10);
  }
  y += 4;

  y = ensureSpace(doc, y, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Top destinations", MARGIN_MM, y);
  y += lineHeightMm(doc, 11) + 1;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (data.topDestinations.length === 0) {
    y = drawWrapped(doc, "— (0 students)", MARGIN_MM, y, TEXT_W_MM, 10);
  } else {
    for (const d of data.topDestinations) {
      y = ensureSpace(doc, y, 8);
      y = drawWrapped(
        doc,
        `${d.label}: ${d.count} student${d.count === 1 ? "" : "s"}`,
        MARGIN_MM,
        y,
        TEXT_W_MM,
        10,
      );
    }
  }
  y += 3;

  y = ensureSpace(doc, y, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Top programs", MARGIN_MM, y);
  y += lineHeightMm(doc, 11) + 1;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (data.topPrograms.length === 0) {
    y = drawWrapped(doc, "— (0 students)", MARGIN_MM, y, TEXT_W_MM, 10);
  } else {
    for (const p of data.topPrograms) {
      y = ensureSpace(doc, y, 8);
      y = drawWrapped(
        doc,
        `${p.label}: ${p.count} student${p.count === 1 ? "" : "s"}`,
        MARGIN_MM,
        y,
        TEXT_W_MM,
        10,
      );
    }
  }
  y += 4;

  y = ensureSpace(doc, y, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Engagement", MARGIN_MM, y);
  y += lineHeightMm(doc, 11) + 1;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const engagePara = `Engagement: ${data.advisorSessionsMonth} advisor sessions · ${data.ambassadorSessionsMonth} ambassador conversations · ${data.essayReviewsMonth} essay reviews · ${data.webinarsMonth} webinars. Universities shortlisted this month: ${data.universitiesShortlistedMonth}.`;
  y = drawWrapped(doc, engagePara, MARGIN_MM, y, TEXT_W_MM, 10);
  y += 3;

  y = ensureSpace(doc, y, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Engagement summary", MARGIN_MM, y);
  y += lineHeightMm(doc, 11) + 1;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const engageRows = [
    `Advisor sessions booked: ${data.advisorSessionsMonth}`,
    `Ambassador sessions booked: ${data.ambassadorSessionsMonth}`,
    `Essays / documents reviewed: ${data.essayReviewsMonth}`,
    `Webinars attended: ${data.webinarsMonth}`,
    `Universities shortlisted: ${data.universitiesShortlistedMonth}`,
  ];
  for (const line of engageRows) {
    y = ensureSpace(doc, y, 8);
    doc.text(line, MARGIN_MM, y);
    y += lineHeightMm(doc, 10);
  }
  y += 4;

  y = ensureSpace(doc, y, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Students at risk", MARGIN_MM, y);
  y += lineHeightMm(doc, 11) + 1;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (data.attentionStudents.length === 0) {
    y = drawWrapped(
      doc,
      "No students flagged this cycle.",
      MARGIN_MM,
      y,
      TEXT_W_MM,
      10,
    );
  } else {
    for (const s of data.attentionStudents) {
      y = ensureSpace(doc, y, 18);
      const risk =
        s.riskClass === "red" ? "Urgent" : "Follow-up";
      const block = `${attentionStudentName(s)} (${risk})\n${s.issue}`;
      y = drawWrapped(doc, block, MARGIN_MM, y, TEXT_W_MM, 10);
      y += 2;
    }
  }
  y += 4;

  y = ensureSpace(doc, y, 25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Student outcomes (all students)", MARGIN_MM, y);
  y += lineHeightMm(doc, 12) + 1;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y = drawWrapped(
    doc,
      `Graduating students in scope: ${data.outcomes.length}. Destinations, programs, application progress, and profile completion.`,
    MARGIN_MM,
    y,
    TEXT_W_MM,
    9,
  );
  y += 3;

  y = ensureSpace(doc, y, 40);

  const head = [
    [
      "Student",
      "Destination",
      "Programs",
      "Apps",
      "Offers",
      "Top offer",
      "Profile",
    ],
  ];
  const body = data.outcomes.map((o) => [
    outcomeStudentName(o),
    o.destinationsSummary,
    o.programsSummary,
    `${o.applicationsSubmitted}/${o.applicationsTotal}`,
    "—",
    "—",
    `${o.profilePercent}%`,
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN_MM, right: MARGIN_MM },
    head,
    body,
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 1.5,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [45, 106, 79],
      textColor: 255,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 32 },
      2: { cellWidth: 32 },
      3: { cellWidth: 16 },
      4: { cellWidth: 14 },
      5: { cellWidth: 22 },
      6: { cellWidth: 16 },
    },
    showHead: "everyPage",
    tableWidth: TEXT_W_MM,
  });

  const finalY = (doc as DocWithAutoTable).lastAutoTable?.finalY;
  if (finalY != null) {
    y = finalY + 6;
  }

  y = ensureSpace(doc, y, 10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  drawWrapped(
    doc,
    "Generated from Univeera school reports. Application outcomes fields shown as — when not yet tracked in data.",
    MARGIN_MM,
    y,
    TEXT_W_MM,
    8,
  );
  doc.setTextColor(0, 0, 0);

  return doc;
}
