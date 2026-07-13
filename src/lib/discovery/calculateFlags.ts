import type {
  AnswerFormat,
  CategoryScore,
  ConfidenceLabel,
  ModuleResultFlags,
  ScoringRulesConfig,
} from "@/types/discovery";

export function calculateFlags(
  answerFormat: AnswerFormat,
  answers: Record<string, number | string>,
  topCategories: CategoryScore[],
  confidence: ConfidenceLabel,
  rules: ScoringRulesConfig,
): ModuleResultFlags {
  const flags: ModuleResultFlags = {
    straightLining: false,
    neutralHeavy: false,
    lowVariance: false,
  };

  const vals = Object.values(answers).filter((v) => v !== undefined && v !== null);

  if (answerFormat !== "forced" && answerFormat !== "scenario") {
    const counts: Record<string, number> = {};
    for (const v of vals) {
      const key = String(v);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    const maxCount = Math.max(0, ...Object.values(counts));
    if (vals.length > 5 && maxCount / vals.length >= rules.flags.straightLiningMinRatio) {
      flags.straightLining = true;
    }
    const neutral = counts[String(rules.flags.neutralValue)] ?? 0;
    if (vals.length > 5 && neutral / vals.length >= rules.flags.neutralHeavyMinRatio) {
      flags.neutralHeavy = true;
    }
    if (
      topCategories.length >= 3 &&
      topCategories[0].pct - topCategories[2].pct <= rules.flags.lowVarianceRatingMaxSpread
    ) {
      flags.lowVariance = true;
    }
  } else if (topCategories.length >= 3) {
    if (
      topCategories[0].pct - topCategories[2].pct <=
      rules.flags.lowVarianceForcedScenarioMaxSpread
    ) {
      flags.lowVariance = true;
    }
  }

  if (confidence === "Balanced profile") {
    flags.lowVariance = true;
  }

  return flags;
}
