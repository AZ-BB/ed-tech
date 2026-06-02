export const ADMIN_REPORT_TYPES = [
  "monthly_summary",
  "student_engagement",
  "token_usage",
  "applications_progress",
  "at_risk_students",
] as const;

export type AdminReportType = (typeof ADMIN_REPORT_TYPES)[number];

export const ADMIN_REPORT_TYPE_LABELS: Record<AdminReportType, string> = {
  monthly_summary: "Monthly Summary",
  student_engagement: "Student Engagement",
  token_usage: "Token Usage",
  applications_progress: "Applications Progress",
  at_risk_students: "At-Risk Students",
};

export function isAdminReportType(v: string): v is AdminReportType {
  return (ADMIN_REPORT_TYPES as readonly string[]).includes(v);
}

export type AdminReportFilters = {
  schoolId: string;
  startDate: string;
  endDate: string;
  reportType: AdminReportType;
};

export type RankedCount = { label: string; count: number };

export type AdminReportMeta = {
  reportType: AdminReportType;
  reportTypeLabel: string;
  schoolId: string;
  schoolName: string;
  startDate: string;
  endDate: string;
  rangeLabel: string;
  generatedAt: string;
};
