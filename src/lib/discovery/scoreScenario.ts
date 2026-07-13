import type { CategoryScore, DiscoveryModuleConfig } from "@/types/discovery";

function resolveScenarioCategory(
  module: DiscoveryModuleConfig,
  questionItemId: string,
  raw: number | string | undefined,
): string | null {
  const question = module.questions.find(
    (q) => q.item_id === questionItemId && q.response_type === "scenario_select",
  );
  if (!question || question.response_type !== "scenario_select") return null;

  if (typeof raw === "string" && module.categories.includes(raw)) {
    return raw;
  }

  const index = typeof raw === "number" ? raw : Number(raw);
  if (Number.isInteger(index) && index >= 0 && index < question.options.length) {
    return question.options[index].category;
  }

  const byLabel = question.options.find((o) => o.label === raw);
  return byLabel?.category ?? null;
}

export function scoreScenarioModule(
  module: DiscoveryModuleConfig,
  answers: Record<string, number | string>,
): CategoryScore[] {
  const scores: Record<string, number> = {};
  for (const cat of module.categories) {
    scores[cat] = 0;
  }

  const scenarioQuestions = module.questions.filter((q) => q.response_type === "scenario_select");
  const totalQuestions = scenarioQuestions.length || 1;

  for (const question of scenarioQuestions) {
    const category = resolveScenarioCategory(module, question.item_id, answers[question.item_id]);
    if (category && scores[category] !== undefined) {
      scores[category] += 1;
    }
  }

  return Object.entries(scores)
    .map(([category, count]) => ({
      category,
      score: count,
      pct: Math.round((count / totalQuestions) * 100),
    }))
    .sort((a, b) => b.pct - a.pct);
}
