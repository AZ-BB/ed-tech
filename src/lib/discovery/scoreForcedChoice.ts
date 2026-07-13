import type { CategoryScore, DiscoveryModuleConfig, ScoringRulesConfig } from "@/types/discovery";

function normalizeForcedAnswer(raw: number | string | undefined): "A" | "B" | null {
  if (raw === "A" || raw === "a") return "A";
  if (raw === "B" || raw === "b") return "B";
  if (raw === 1 || raw === "1") return "A";
  if (raw === 2 || raw === "2") return "B";
  return null;
}

export function scoreForcedChoiceModule(
  module: DiscoveryModuleConfig,
  answers: Record<string, number | string>,
  rules: ScoringRulesConfig,
): CategoryScore[] {
  const scores: Record<string, number> = {};
  for (const cat of module.categories) {
    scores[cat] = 0;
  }

  for (const question of module.questions) {
    if (question.response_type !== "forced_choice") continue;
    const choice = normalizeForcedAnswer(answers[question.item_id]);
    if (!choice) continue;
    const category = choice === "A" ? question.optionA.category : question.optionB.category;
    if (scores[category] !== undefined) {
      scores[category] += 1;
    }
  }

  const perPole = rules.forced_choice.questionsPerPole;

  return Object.entries(scores)
    .map(([category, count]) => ({
      category,
      score: count,
      pct: Math.round((count / perPole) * 100),
    }))
    .sort((a, b) => b.pct - a.pct);
}
