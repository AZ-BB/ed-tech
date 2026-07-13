import type { CategoryScore, ConfidenceLabel, ScoringRulesConfig } from "@/types/discovery";

export function calculateConfidence(
  sortedScores: CategoryScore[],
  rules: ScoringRulesConfig,
): ConfidenceLabel {
  if (sortedScores.length < 2) return "Strong signal";

  const gap = sortedScores[0].pct - sortedScores[1].pct;
  if (gap >= rules.confidence.strongMinGap) return "Strong signal";
  if (gap >= rules.confidence.emergingMinGap) return "Emerging signal";
  return "Balanced profile";
}
