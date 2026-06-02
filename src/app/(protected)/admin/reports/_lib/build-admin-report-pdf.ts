import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import type {
  AdminReportPayload,
  ApplicationsProgressPayload,
  AtRiskStudentsPayload,
  MonthlySummaryPayload,
  StudentEngagementPayload,
  TokenUsagePayload,
} from "./report-payloads";
import {
  BRAND,
  COMPACT_TABLE,
  MARGIN_MM,
  adminReportFilename,
  drawAdminReportHeader,
  drawHorizontalBarChart,
  drawRankedTable,
  drawStatCards,
  drawWrapped,
  ensureSpace,
  lastTableY,
  sectionTitle,
  SECTION_GAP_MM,
  TEXT_W_MM,
} from "./pdf/pdf-draw-utils";

function buildMonthlySummaryPdf(data: MonthlySummaryPayload): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN_MM;
  y = drawAdminReportHeader(doc, data.meta, y);
  y = drawStatCards(doc, [
    { value: data.totalStudents, label: "Total students" },
    { value: data.activeInRange, label: "Active in period" },
    { value: data.applicationsStarted, label: "Apps started" },
    { value: data.applicationsSubmitted, label: "Apps submitted" },
  ], y);
  y = drawStatCards(doc, [
    { value: data.essayReviews, label: "Essay reviews" },
    { value: data.matchingRuns, label: "AI matching runs" },
    { value: data.advisorSessions, label: "Advisor sessions" },
    { value: data.ambassadorSessions, label: "Ambassador sessions" },
  ], y);
  y = drawHorizontalBarChart(
    doc,
    "Weekly platform activity",
    data.weeklyActivity.map((w) => ({ label: w.label, value: w.count })),
    y,
  );
  y = drawHorizontalBarChart(
    doc,
    "Feature usage",
    data.featureUsage.map((f) => ({ label: f.label, value: f.count })),
    y,
  );
  if (data.topSchools.length > 0) {
    y = drawRankedTable(doc, "Top schools by students", data.topSchools, y);
  }
  y = drawRankedTable(
    doc,
    "Top shortlisted universities",
    data.topUniversities,
    y,
  );
  y = drawRankedTable(
    doc,
    "Top target countries",
    data.topDestinations,
    y,
  );
  return doc;
}

function buildStudentEngagementPdf(data: StudentEngagementPayload): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN_MM;
  y = drawAdminReportHeader(doc, data.meta, y);
  y = drawStatCards(doc, [
    { value: data.shortlistActions, label: "University shortlists" },
    { value: data.advisorSessions, label: "Advisor sessions booked" },
    { value: data.ambassadorSessions, label: "Ambassador sessions" },
    { value: data.applicationsStarted, label: "Applications started" },
  ], y);
  y = drawRankedTable(doc, "Top target countries", data.topDestinations, y);
  y = drawRankedTable(
    doc,
    "Top shortlisted universities",
    data.topUniversities,
    y,
  );
  y = drawRankedTable(
    doc,
    "Top shortlisted scholarships",
    data.topScholarships,
    y,
  );
  return doc;
}

function buildTokenUsagePdf(data: TokenUsagePayload): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN_MM;
  y = drawAdminReportHeader(doc, data.meta, y);
  y = drawStatCards(doc, [
    { value: data.totalTokens, label: "Total tokens" },
    { value: data.essayReviewTokens, label: "Essay review tokens" },
    { value: data.matchingTokens, label: "Matching tokens" },
    { value: data.essayReviewCount + data.matchingCount, label: "AI requests" },
  ], y);
  y = drawHorizontalBarChart(
    doc,
    "Tokens by feature (count)",
    [
      { label: "Essay review", value: data.essayReviewCount },
      { label: "University matching", value: data.matchingCount },
    ],
    y,
  );
  y = drawHorizontalBarChart(
    doc,
    "Daily token usage",
    data.dailyUsage.map((d) => ({ label: d.label, value: d.tokens })),
    y,
    14,
  );
  if (data.bySchool.length > 0) {
    y = drawHorizontalBarChart(
      doc,
      "Tokens by school",
      data.bySchool.map((s) => ({ label: s.label, value: s.tokens })),
      y,
    );
  }
  return doc;
}

function buildApplicationsProgressPdf(
  data: ApplicationsProgressPayload,
): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN_MM;
  y = drawAdminReportHeader(doc, data.meta, y);
  y = drawStatCards(doc, [
    { value: data.startedInRange, label: "Started in period" },
    { value: data.submittedInRange, label: "Submitted in period" },
    { value: data.pendingAssignment, label: "Pending assignment" },
    {
      value: data.statusCounts.reduce((s, c) => s + c.count, 0),
      label: "Total applications",
    },
  ], y);
  y = ensureSpace(doc, y, 24);
  y = sectionTitle(doc, "Status breakdown", MARGIN_MM, y);
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN_MM, right: MARGIN_MM },
    head: [["Status", "Count"]],
    body: data.statusCounts.map((s) => [
      s.label,
      s.count.toLocaleString(),
    ]),
    ...COMPACT_TABLE,
  });
  y = (lastTableY(doc) ?? y) + SECTION_GAP_MM;
  if (data.recentApplications.length > 0) {
    y = ensureSpace(doc, y, 30);
    y = sectionTitle(doc, "Applications started in period", MARGIN_MM, y);
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN_MM, right: MARGIN_MM },
      head: [["Student", "School", "Status", "Handler", "Created"]],
      body: data.recentApplications.map((r) => [
        r.studentName,
        r.schoolName,
        r.statusLabel,
        r.handlerName,
        r.createdAt,
      ]),
      ...COMPACT_TABLE,
      styles: { ...COMPACT_TABLE.styles, fontSize: 7, cellPadding: 1.5 },
    });
  }
  return doc;
}

function buildAtRiskStudentsPdf(data: AtRiskStudentsPayload): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN_MM;
  y = drawAdminReportHeader(doc, data.meta, y);
  y = drawStatCards(doc, [
    { value: data.needAttentionCount, label: "Students at risk" },
    { value: data.students.filter((s) => s.riskClass === "red").length, label: "Urgent" },
    { value: data.students.filter((s) => s.riskClass === "amber").length, label: "Follow-up" },
    { value: data.students.length, label: "Listed in report" },
  ], y);
  y = ensureSpace(doc, y, 20);
  y = sectionTitle(doc, "At-risk students", MARGIN_MM, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.muted);
  y = drawWrapped(
    doc,
    "Students with incomplete profiles, no activity in 30+ days, or no university shortlist.",
    MARGIN_MM,
    y,
    TEXT_W_MM,
    8,
    BRAND.muted,
  );
  y += 2;
  const showSchool = !data.meta.schoolId;
  const head = showSchool
    ? [["Student", "School", "Grade", "Risk", "Issue"]]
    : [["Student", "Grade", "Risk", "Issue"]];
  const body =
    data.students.length === 0
      ? [showSchool ? ["—", "—", "—", "—", "None"] : ["—", "—", "—", "None"]]
      : data.students.map((s) => {
          const name = [s.firstName, s.lastName].filter(Boolean).join(" ");
          const row = showSchool
            ? [name, s.schoolName || "—", s.grade, s.riskLabel, s.issue]
            : [name, s.grade, s.riskLabel, s.issue];
          return row;
        });
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN_MM, right: MARGIN_MM },
    head,
    body,
    ...COMPACT_TABLE,
    styles: { ...COMPACT_TABLE.styles, fontSize: 7, cellPadding: 1.5 },
  });
  return doc;
}

export function buildAdminReportPdf(payload: AdminReportPayload): jsPDF {
  switch (payload.meta.reportType) {
    case "monthly_summary":
      return buildMonthlySummaryPdf(payload as MonthlySummaryPayload);
    case "student_engagement":
      return buildStudentEngagementPdf(payload as StudentEngagementPayload);
    case "token_usage":
      return buildTokenUsagePdf(payload as TokenUsagePayload);
    case "applications_progress":
      return buildApplicationsProgressPdf(payload as ApplicationsProgressPayload);
    case "at_risk_students":
      return buildAtRiskStudentsPdf(payload as AtRiskStudentsPayload);
  }
}

export function downloadAdminReportPdf(payload: AdminReportPayload): void {
  const doc = buildAdminReportPdf(payload);
  doc.save(adminReportFilename(payload.meta));
}
