export type PayoutStatus = "pending" | "paid" | "canceled";

export type ApplicationPaymentPayout = {
  percentage: number;
  amount: number;
  status: PayoutStatus;
};

export type ApplicationPayoutSummary = {
  payoutPercentage: number;
  pendingAmount: number;
  pendingCount: number;
  paidAmount: number;
  paidCount: number;
};

export type ApplicationPayoutRow = {
  id: number;
  advisorId: string;
  advisorName: string;
  paymentId: number;
  paymentAmount: number;
  paymentPaidAt: string | null;
  applicationId: number;
  percentage: number;
  amount: number;
  status: PayoutStatus;
  paidAt: string | null;
  createdAt: string | null;
};

export type AdvisorPayoutsSummary = {
  totalPaidToAdvisor: number;
  totalPending: number;
  totalRevenueToApp: number;
  paidCount: number;
  pendingCount: number;
};

export type AdvisorPayoutTableRow = ApplicationPayoutRow & {
  studentName: string | null;
  kind: "application" | "post_admission";
  referenceId: number;
  referenceLabel: string;
};

export function calculatePayoutAmount(paymentAmount: number, percentage: number): number {
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) return 0;
  if (!Number.isFinite(percentage) || percentage <= 0) return 0;
  return Math.round((paymentAmount * percentage) / 100);
}
