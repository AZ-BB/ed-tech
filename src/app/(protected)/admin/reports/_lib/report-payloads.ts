import type { AdminReportMeta, RankedCount } from "./report-types";

export type AdminReportsOverview = {
  totalUsers: number;
  activeInRange: number;
  totalShortlists: number;
  tokensUsed: number;
};

export type WeeklyActivityPoint = { label: string; count: number };

export type MonthlySummaryPayload = {
  meta: AdminReportMeta;
  totalStudents: number;
  activeInRange: number;
  essayReviews: number;
  matchingRuns: number;
  advisorSessions: number;
  ambassadorSessions: number;
  applicationsStarted: number;
  applicationsSubmitted: number;
  topSchools: RankedCount[];
  topUniversities: RankedCount[];
  topDestinations: RankedCount[];
  weeklyActivity: WeeklyActivityPoint[];
  featureUsage: RankedCount[];
};

export type StudentEngagementPayload = {
  meta: AdminReportMeta;
  topDestinations: RankedCount[];
  topUniversities: RankedCount[];
  topScholarships: RankedCount[];
  advisorSessions: number;
  ambassadorSessions: number;
  applicationsStarted: number;
  shortlistActions: number;
};

export type TokenUsageByDay = { label: string; tokens: number };
export type TokenUsageBySchool = { label: string; tokens: number };

export type TokenUsagePayload = {
  meta: AdminReportMeta;
  totalTokens: number;
  matchingTokens: number;
  essayReviewTokens: number;
  matchingCount: number;
  essayReviewCount: number;
  dailyUsage: TokenUsageByDay[];
  bySchool: TokenUsageBySchool[];
};

export type ApplicationStatusCount = { status: string; label: string; count: number };

export type ApplicationProgressRow = {
  id: number;
  studentName: string;
  schoolName: string;
  status: string;
  statusLabel: string;
  handlerName: string;
  createdAt: string;
};

export type ApplicationsProgressPayload = {
  meta: AdminReportMeta;
  statusCounts: ApplicationStatusCount[];
  pendingAssignment: number;
  submittedInRange: number;
  startedInRange: number;
  recentApplications: ApplicationProgressRow[];
};

export type AtRiskStudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  schoolName: string;
  riskClass: "red" | "amber";
  riskLabel: string;
  issue: string;
};

export type AtRiskStudentsPayload = {
  meta: AdminReportMeta;
  needAttentionCount: number;
  students: AtRiskStudentRow[];
};

export type AdminReportPayload =
  | MonthlySummaryPayload
  | StudentEngagementPayload
  | TokenUsagePayload
  | ApplicationsProgressPayload
  | AtRiskStudentsPayload;
