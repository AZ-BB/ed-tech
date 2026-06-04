export type StudentCreditUsageItem = {
  id: string;
  at: string;
  amount: number;
  creditType: string;
  creditTypeLabel: string;
  status: string | null;
  statusLabel: string;
  amountDisplay: string;
  reference: string | null;
  actorName: string | null;
};

export type StudentCreditUsagePanelProps = {
  rows: StudentCreditUsageItem[];
  totalRows: number;
  page: number;
  limit: number;
};

export function formatStudentCreditTypeLabel(type: string): string {
  switch (type) {
    case "advisor":
      return "Advisor";
    case "ambassador":
      return "Ambassador";
    case "base_credit":
      return "Base credits";
    case "extra_credits":
      return "Extra credits";
    default:
      return type.replace(/_/g, " ");
  }
}

export function formatStudentCreditReference(input: {
  advisorSessionId: number | null;
  ambassadorSessionRequestId: number | null;
}): string | null {
  if (input.advisorSessionId != null) {
    return `Advisor session #${input.advisorSessionId}`;
  }
  if (input.ambassadorSessionRequestId != null) {
    return `Ambassador session #${input.ambassadorSessionRequestId}`;
  }
  return null;
}
