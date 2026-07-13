import type { CategoryScore, DiscoveryModuleConfig, ModuleAnswer, ScoringRulesConfig } from "@/types/discovery";

type CategoryAccumulator = Record<string, { sum: number; count: number }>;

function initCategories(categories: string[]): CategoryAccumulator {
  const scores: CategoryAccumulator = {};
  for (const cat of categories) {
    scores[cat] = { sum: 0, count: 0 };
  }
  return scores;
}

export function scoreRatingModule(
  module: DiscoveryModuleConfig,
  answers: Record<string, number | string>,
  rules: ScoringRulesConfig,
): CategoryScore[] {
  const scores = initCategories(module.categories);
  const maxValue = rules.rating_1_5.maxValue;

  for (const question of module.questions) {
    if (question.response_type !== "rating_1_5") continue;
    const raw = answers[question.item_id];
    const value = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(value) || !scores[question.category]) continue;
    scores[question.category].sum += value;
    scores[question.category].count += 1;
  }

  return Object.entries(scores)
    .map(([category, { sum, count }]) => {
      const avg = count > 0 ? sum / count : 0;
      const pct = Math.round((avg / maxValue) * 100);
      return { category, score: avg, pct };
    })
    .sort((a, b) => b.pct - a.pct);
}
