/** True when the student has used all credits allowed for this category. */
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
  return `This student has used all allowed credit for ${label}.`;
}
