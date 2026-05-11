/** Risk pill + inactive signals shared by school student detail and school dashboard. */

export function pickLatestActivityIso(
  actAt: string | null | undefined,
  aiAt: string | null | undefined,
): string | null {
  if (!actAt && !aiAt) return null;
  if (!actAt) return aiAt!;
  if (!aiAt) return actAt;
  return new Date(aiAt).getTime() > new Date(actAt).getTime() ? aiAt : actAt;
}

export function riskFromSignals(
  profilePercent: number,
  inactiveWeek: boolean,
): { riskClass: "green" | "amber" | "red"; riskLabel: string } {
  if (profilePercent < 28) return { riskClass: "red", riskLabel: "Urgent" };
  if (inactiveWeek || profilePercent < 55)
    return { riskClass: "amber", riskLabel: "Follow-up" };
  return { riskClass: "green", riskLabel: "On track" };
}

/** One-line explanation for dashboard “needs follow-up” rows (matches riskFromSignals). */
export function schoolDashboardAttentionIssue(
  profilePercent: number,
  inactiveWeek: boolean,
): string {
  if (profilePercent < 28)
    return `Profile completion is ${profilePercent}% — needs attention`;
  if (inactiveWeek && profilePercent < 55)
    return "No activity in 7+ days and profile still under 55%";
  if (inactiveWeek) return "No activity on the platform in 7+ days";
  if (profilePercent < 55)
    return `Profile completion is ${profilePercent}% — encourage next steps`;
  return "Needs counselor follow-up";
}
