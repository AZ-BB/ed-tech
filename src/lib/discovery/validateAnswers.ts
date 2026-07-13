import type { DiscoveryModuleConfig, ModuleAnswer, ValidationError } from "@/types/discovery";

function push(errors: ValidationError[], path: string, message: string) {
  errors.push({ path, message });
}

export function answersToRecord(answers: ModuleAnswer[]): Record<string, number | string> {
  const record: Record<string, number | string> = {};
  for (const a of answers) {
    record[a.questionId] = a.answer;
  }
  return record;
}

export function validateAnswers(
  module: DiscoveryModuleConfig,
  answers: ModuleAnswer[],
): { ok: true; record: Record<string, number | string> } | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const record = answersToRecord(answers);
  const questionIds = new Set(module.questions.map((q) => q.item_id));

  for (const question of module.questions) {
    const raw = record[question.item_id];
    if (raw === undefined || raw === null || raw === "") {
      push(errors, question.item_id, "Answer is required.");
      continue;
    }

    if (question.response_type === "rating_1_5") {
      const value = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isInteger(value) || value < 1 || value > 5) {
        push(errors, question.item_id, "Rating must be an integer from 1 to 5.");
      }
      continue;
    }

    if (question.response_type === "forced_choice") {
      const valid =
        raw === "A" ||
        raw === "B" ||
        raw === "a" ||
        raw === "b" ||
        raw === 1 ||
        raw === 2 ||
        raw === "1" ||
        raw === "2";
      if (!valid) {
        push(errors, question.item_id, "Forced choice answer must be A/B or 1/2.");
      }
      continue;
    }

    if (question.response_type === "scenario_select") {
      const index = typeof raw === "number" ? raw : Number(raw);
      const byCategory = typeof raw === "string" && module.categories.includes(raw);
      const byIndex =
        Number.isInteger(index) && index >= 0 && index < question.options.length;
      const byLabel = question.options.some((o) => o.label === raw);
      if (!byCategory && !byIndex && !byLabel) {
        push(errors, question.item_id, "Invalid scenario selection.");
      }
    }
  }

  for (const answer of answers) {
    if (!questionIds.has(answer.questionId)) {
      push(errors, answer.questionId, "Unknown questionId.");
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, record };
}
