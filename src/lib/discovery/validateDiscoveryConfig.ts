import type {
  CombinedProfileConfig,
  DiscoveryModuleConfig,
  DiscoveryQuestion,
  PortableDiscoveryDocument,
  PortableDiscoveryTest,
  ScoringRulesConfig,
  ScaleId,
  ValidationError,
} from "@/types/discovery";
import { DEFAULT_SCORING_RULES } from "@/types/discovery";

const ANSWER_FORMATS = new Set([
  "interest",
  "frequency",
  "importance",
  "preference",
  "forced",
  "scenario",
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function push(errors: ValidationError[], path: string, message: string) {
  errors.push({ path, message });
}

function normalizeScoringRules(raw: unknown): ScoringRulesConfig {
  if (!isObject(raw)) return DEFAULT_SCORING_RULES;

  const rating = isObject(raw.rating_1_5) ? raw.rating_1_5 : {};
  const forced = isObject(raw.forced_choice) ? raw.forced_choice : {};
  const profile = isObject(raw.profile_match) ? raw.profile_match : {};
  const confidence = isObject(raw.confidence) ? raw.confidence : {};
  const flags = isObject(raw.flags) ? raw.flags : {};

  return {
    rating_1_5: {
      maxValue: Number(rating.maxValue ?? DEFAULT_SCORING_RULES.rating_1_5.maxValue),
    },
    forced_choice: {
      questionsPerPole: Number(
        forced.questionsPerPole ?? DEFAULT_SCORING_RULES.forced_choice.questionsPerPole,
      ),
    },
    profile_match: {
      topCategoryBonus: Number(
        profile.topCategoryBonus ?? DEFAULT_SCORING_RULES.profile_match.topCategoryBonus,
      ),
    },
    confidence: {
      strongMinGap: Number(
        confidence.strongMinGap ?? DEFAULT_SCORING_RULES.confidence.strongMinGap,
      ),
      emergingMinGap: Number(
        confidence.emergingMinGap ?? DEFAULT_SCORING_RULES.confidence.emergingMinGap,
      ),
    },
    flags: {
      straightLiningMinRatio: Number(
        flags.straightLiningMinRatio ?? DEFAULT_SCORING_RULES.flags.straightLiningMinRatio,
      ),
      neutralHeavyMinRatio: Number(
        flags.neutralHeavyMinRatio ?? DEFAULT_SCORING_RULES.flags.neutralHeavyMinRatio,
      ),
      neutralValue: Number(flags.neutralValue ?? DEFAULT_SCORING_RULES.flags.neutralValue),
      lowVarianceRatingMaxSpread: Number(
        flags.lowVarianceRatingMaxSpread ??
          DEFAULT_SCORING_RULES.flags.lowVarianceRatingMaxSpread,
      ),
      lowVarianceForcedScenarioMaxSpread: Number(
        flags.lowVarianceForcedScenarioMaxSpread ??
          DEFAULT_SCORING_RULES.flags.lowVarianceForcedScenarioMaxSpread,
      ),
    },
  };
}

function validateQuestion(
  question: unknown,
  modulePath: string,
  errors: ValidationError[],
): DiscoveryQuestion | null {
  if (!isObject(question)) {
    push(errors, modulePath, "Question must be an object.");
    return null;
  }

  const itemId = String(question.item_id ?? "").trim();
  const text = String(question.text ?? "").trim();
  const responseType = String(question.response_type ?? "").trim();

  if (!itemId) push(errors, `${modulePath}.item_id`, "item_id is required.");
  if (!text) push(errors, `${modulePath}.text`, "text is required.");

  if (responseType === "rating_1_5") {
    const category = String(question.category ?? "").trim();
    const scale = String(question.scale ?? "").trim();
    if (!category) push(errors, `${modulePath}.category`, "category is required.");
    if (!scale) push(errors, `${modulePath}.scale`, "scale is required.");
    return {
      item_id: itemId,
      text,
      response_type: "rating_1_5",
      scale: scale as ScaleId,
      category,
    };
  }

  if (responseType === "forced_choice") {
    const optionA = question.optionA;
    const optionB = question.optionB;
    if (!isObject(optionA) || !isObject(optionB)) {
      push(errors, modulePath, "forced_choice requires optionA and optionB.");
      return null;
    }
    return {
      item_id: itemId,
      text,
      response_type: "forced_choice",
      optionA: {
        label: String(optionA.label ?? ""),
        category: String(optionA.category ?? ""),
      },
      optionB: {
        label: String(optionB.label ?? ""),
        category: String(optionB.category ?? ""),
      },
    };
  }

  if (responseType === "scenario_select") {
    const options = Array.isArray(question.options) ? question.options : [];
    if (options.length === 0) {
      push(errors, `${modulePath}.options`, "scenario_select requires options.");
    }
    return {
      item_id: itemId,
      text,
      response_type: "scenario_select",
      options: options.map((opt) => {
        const o = isObject(opt) ? opt : {};
        return {
          label: String(o.label ?? ""),
          category: String(o.category ?? ""),
        };
      }),
    };
  }

  push(errors, `${modulePath}.response_type`, `Invalid response_type: ${responseType}`);
  return null;
}

function validateTest(
  test: unknown,
  index: number,
  errors: ValidationError[],
): PortableDiscoveryTest | null {
  const basePath = `tests[${index}]`;
  if (!isObject(test)) {
    push(errors, basePath, "Test must be an object.");
    return null;
  }

  const moduleId = String(test.module_id ?? "").trim();
  const title = String(test.title ?? "").trim();
  const number = String(test.number ?? "").trim();
  const answerFormat = String(test.answer_format ?? "").trim();

  if (!moduleId) push(errors, `${basePath}.module_id`, "module_id is required.");
  if (!title) push(errors, `${basePath}.title`, "title is required.");
  if (!ANSWER_FORMATS.has(answerFormat)) {
    push(errors, `${basePath}.answer_format`, `Invalid answer_format: ${answerFormat}`);
  }

  const categories = Array.isArray(test.categories)
    ? test.categories.map((c) => String(c).trim()).filter(Boolean)
    : [];

  const questionsRaw = Array.isArray(test.questions) ? test.questions : [];
  const questions = questionsRaw
    .map((q, qi) => validateQuestion(q, `${basePath}.questions[${qi}]`, errors))
    .filter((q): q is DiscoveryQuestion => q !== null);

  const numItems = Number(test.num_items ?? questions.length);
  if (numItems !== questions.length) {
    push(
      errors,
      `${basePath}.num_items`,
      `num_items (${numItems}) must match questions.length (${questions.length}).`,
    );
  }

  const profiles = Array.isArray(test.profiles)
    ? test.profiles
        .map((p, pi) => {
          const path = `${basePath}.profiles[${pi}]`;
          if (!isObject(p)) {
            push(errors, path, "Profile must be an object.");
            return null;
          }
          return {
            profile_id: String(p.profile_id ?? "").trim(),
            title: String(p.title ?? "").trim(),
            matching_categories: Array.isArray(p.matching_categories)
              ? p.matching_categories.map((c) => String(c).trim()).filter(Boolean)
              : [],
            majors_strong: Array.isArray(p.majors_strong)
              ? p.majors_strong.map((m) => String(m).trim()).filter(Boolean)
              : [],
            majors_related: Array.isArray(p.majors_related)
              ? p.majors_related.map((m) => String(m).trim()).filter(Boolean)
              : [],
            majors_stretch: Array.isArray(p.majors_stretch)
              ? p.majors_stretch.map((m) => String(m).trim()).filter(Boolean)
              : [],
            careers: Array.isArray(p.careers)
              ? p.careers.map((c) => String(c).trim()).filter(Boolean)
              : [],
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null)
    : [];

  return {
    module_id: moduleId,
    number,
    title,
    answer_format: answerFormat as PortableDiscoveryTest["answer_format"],
    num_items: questions.length,
    categories,
    questions,
    profiles,
  };
}

export function validatePortableDiscoveryDocument(
  raw: unknown,
): { ok: true; document: PortableDiscoveryDocument } | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  if (!isObject(raw)) {
    return { ok: false, errors: [{ path: "", message: "Document must be a JSON object." }] };
  }

  const testsRaw = Array.isArray(raw.tests) ? raw.tests : [];
  const tests = testsRaw
    .map((t, i) => validateTest(t, i, errors))
    .filter((t): t is PortableDiscoveryTest => t !== null);

  const moduleIds = new Set<string>();
  const itemIds = new Set<string>();
  const profileIds = new Set<string>();

  for (const test of tests) {
    if (moduleIds.has(test.module_id)) {
      push(errors, "tests", `Duplicate module_id: ${test.module_id}`);
    }
    moduleIds.add(test.module_id);

    for (const q of test.questions) {
      const key = `${test.module_id}:${q.item_id}`;
      if (itemIds.has(key)) {
        push(errors, "tests", `Duplicate item_id ${q.item_id} in module ${test.module_id}`);
      }
      itemIds.add(key);
    }

    for (const p of test.profiles) {
      if (profileIds.has(p.profile_id)) {
        push(errors, "tests", `Duplicate profile_id: ${p.profile_id}`);
      }
      profileIds.add(p.profile_id);
    }
  }

  const combinedProfiles: CombinedProfileConfig[] = Array.isArray(raw.combined_profiles)
    ? raw.combined_profiles
        .map((cp, i) => {
          const path = `combined_profiles[${i}]`;
          if (!isObject(cp)) {
            push(errors, path, "Combined profile must be an object.");
            return null;
          }
          return {
            profile_id: String(cp.profile_id ?? "").trim(),
            title: String(cp.title ?? "").trim(),
            summary: String(cp.summary ?? "").trim(),
            triggers: Array.isArray(cp.triggers)
              ? cp.triggers.map((group) =>
                  Array.isArray(group) ? group.map((c) => String(c).trim()).filter(Boolean) : [],
                )
              : [],
          };
        })
        .filter((cp): cp is CombinedProfileConfig => cp !== null)
    : [];

  const scoringRules = normalizeScoringRules(raw.scoring_rules);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const scales = isObject(raw.scales) ? (raw.scales as PortableDiscoveryDocument["scales"]) : {};

  return {
    ok: true,
    document: {
      scales,
      tests,
      combined_profiles: combinedProfiles,
      scoring_rules: scoringRules,
    },
  };
}

export function moduleConfigFromPortableTest(
  test: PortableDiscoveryTest,
  sortOrder: number,
  isActive = true,
): DiscoveryModuleConfig {
  return {
    moduleId: test.module_id,
    title: test.title,
    number: test.number,
    subtitle: null,
    description: null,
    answerFormat: test.answer_format,
    numItems: test.questions.length,
    isActive,
    sortOrder,
    categories: test.categories,
    questions: test.questions,
    profiles: test.profiles,
  };
}

export function validateModuleConfig(
  module: DiscoveryModuleConfig,
): { ok: true } | { ok: false; errors: ValidationError[] } {
  const doc: PortableDiscoveryDocument = {
    scales: {},
    tests: [
      {
        module_id: module.moduleId,
        number: module.number,
        title: module.title,
        answer_format: module.answerFormat,
        num_items: module.questions.length,
        categories: module.categories,
        questions: module.questions,
        profiles: module.profiles,
      },
    ],
    combined_profiles: [],
    scoring_rules: DEFAULT_SCORING_RULES,
  };
  const result = validatePortableDiscoveryDocument(doc);
  if (!result.ok) return result;
  return { ok: true };
}
