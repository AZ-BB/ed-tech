import type { ReportDateBounds } from "./report-date-range";
import { fetchAdminReportApplicationsProgress } from "./fetch-admin-report-applications-progress";
import { fetchAdminReportAtRiskStudents } from "./fetch-admin-report-at-risk";
import { fetchAdminReportMonthlySummary } from "./fetch-admin-report-monthly-summary";
import { fetchAdminReportStudentEngagement } from "./fetch-admin-report-student-engagement";
import { fetchAdminReportTokenUsage } from "./fetch-admin-report-token-usage";
import type { AdminReportPayload } from "./report-payloads";
import type { AdminReportFilters } from "./report-types";

export async function fetchAdminReportData(
  filters: AdminReportFilters,
  bounds: ReportDateBounds,
): Promise<AdminReportPayload> {
  switch (filters.reportType) {
    case "monthly_summary":
      return fetchAdminReportMonthlySummary(filters, bounds);
    case "student_engagement":
      return fetchAdminReportStudentEngagement(filters, bounds);
    case "token_usage":
      return fetchAdminReportTokenUsage(filters, bounds);
    case "applications_progress":
      return fetchAdminReportApplicationsProgress(filters, bounds);
    case "at_risk_students":
      return fetchAdminReportAtRiskStudents(filters, bounds);
  }
}
