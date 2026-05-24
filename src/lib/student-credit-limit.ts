/** True when the student has no remaining credits for this category. */
export function isStudentCreditBalanceExhausted(
  remaining: number | null,
): boolean {
  return remaining == null || remaining <= 0;
}

/** @deprecated Use isStudentCreditBalanceExhausted for wallet-based credits. */
export function isStudentCreditLimitExhausted(
  usedNet: number,
  limit: number | null,
): boolean {
  return limit != null && usedNet >= limit;
}

export function studentCreditLimitExhaustedMessage(
  kind: "advisor" | "ambassador",
): string {
  const label = kind === "advisor" ? "Advisor" : "Ambassador";
  return `This student has no remaining ${label.toLowerCase()} session credits.`;
}
