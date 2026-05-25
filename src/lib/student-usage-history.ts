export type StudentUsageHistoryKind =
  | "advisor_session"
  | "ambassador_session"
  | "essay_review"
  | "ai_matching"
  | "credit_assignment";

export type StudentUsageHistoryItem = {
  id: string;
  kind: StudentUsageHistoryKind;
  at: string;
  status: string | null;
  detail: string | null;
  personName: string | null;
  destination: string | null;
  model: string | null;
  tokens: number | null;
  creditType: "advisor" | "ambassador" | null;
  creditAmount: number | null;
  addedBy: string | null;
};

export const STUDENT_USAGE_HISTORY_KINDS: readonly StudentUsageHistoryKind[] = [
  "advisor_session",
  "ambassador_session",
  "essay_review",
  "ai_matching",
  "credit_assignment",
] as const;

export const STUDENT_USAGE_HISTORY_TAB_LABELS: Record<
  StudentUsageHistoryKind,
  string
> = {
  advisor_session: "Advisor",
  ambassador_session: "Ambassador",
  essay_review: "Essay review",
  ai_matching: "AI matching",
  credit_assignment: "Credits",
};

export type StudentUsageHistoryKindCounts = Record<
  StudentUsageHistoryKind,
  number
>;

export function parseStudentUsageHistoryKind(
  raw: string | string[] | undefined,
): StudentUsageHistoryKind {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (s && STUDENT_USAGE_HISTORY_KINDS.includes(s as StudentUsageHistoryKind)) {
    return s as StudentUsageHistoryKind;
  }
  return "advisor_session";
}

export function emptyStudentUsageHistoryKindCounts(): StudentUsageHistoryKindCounts {
  return {
    advisor_session: 0,
    ambassador_session: 0,
    essay_review: 0,
    ai_matching: 0,
    credit_assignment: 0,
  };
}

/** @deprecated Use StudentUsageHistoryItem */
export type AdminStudentUsageHistoryItem = StudentUsageHistoryItem;
