import type {
  DiscoveryConfig,
  DiscoveryModuleConfig,
  DiscoveryModuleContentJson,
  DiscoveryModuleRow,
  DiscoverySettingsRow,
  PortableDiscoveryDocument,
  PortableDiscoveryTest,
  ScoringRulesConfig,
} from "@/types/discovery";
import { DEFAULT_SCORING_RULES } from "@/types/discovery";

export function rowToModuleConfig(row: DiscoveryModuleRow): DiscoveryModuleConfig {
  const content = normalizeContentJson(row.content_json);
  return {
    moduleId: row.id,
    title: row.title,
    number: row.number,
    subtitle: row.subtitle,
    description: row.description,
    answerFormat: row.answer_format,
    numItems: row.num_items,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    categories: content.categories,
    questions: content.questions,
    profiles: content.profiles,
  };
}

function normalizeContentJson(raw: unknown): DiscoveryModuleContentJson {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { categories: [], questions: [], profiles: [] };
  }
  const obj = raw as Record<string, unknown>;
  return {
    categories: Array.isArray(obj.categories)
      ? obj.categories.map((c) => String(c)).filter(Boolean)
      : [],
    questions: Array.isArray(obj.questions) ? (obj.questions as DiscoveryModuleContentJson["questions"]) : [],
    profiles: Array.isArray(obj.profiles) ? (obj.profiles as DiscoveryModuleContentJson["profiles"]) : [],
  };
}

export function moduleConfigToContentJson(module: DiscoveryModuleConfig): DiscoveryModuleContentJson {
  return {
    categories: module.categories,
    questions: module.questions,
    profiles: module.profiles,
  };
}

export function moduleConfigToRowInsert(
  module: DiscoveryModuleConfig,
  updatedBy: string | null,
): Omit<DiscoveryModuleRow, "updated_at"> {
  return {
    id: module.moduleId,
    title: module.title,
    number: module.number,
    subtitle: module.subtitle,
    description: module.description,
    answer_format: module.answerFormat,
    num_items: module.questions.length,
    is_active: module.isActive,
    sort_order: module.sortOrder,
    content_json: moduleConfigToContentJson(module),
    updated_by: updatedBy,
  };
}

export function portableTestToModuleConfig(
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

export function moduleConfigToPortableTest(module: DiscoveryModuleConfig): PortableDiscoveryTest {
  return {
    module_id: module.moduleId,
    number: module.number,
    title: module.title,
    answer_format: module.answerFormat,
    num_items: module.questions.length,
    categories: module.categories,
    questions: module.questions,
    profiles: module.profiles,
  };
}

export function assemblePortableDocument(
  modules: DiscoveryModuleConfig[],
  settings: Pick<
    DiscoverySettingsRow,
    "scales_json" | "combined_profiles_json" | "scoring_rules_json"
  >,
): PortableDiscoveryDocument {
  return {
    scales: settings.scales_json ?? {},
    tests: modules.map(moduleConfigToPortableTest),
    combined_profiles: settings.combined_profiles_json ?? [],
    scoring_rules: settings.scoring_rules_json ?? DEFAULT_SCORING_RULES,
  };
}

export function assembleDiscoveryConfig(
  modules: DiscoveryModuleRow[],
  settings: DiscoverySettingsRow,
): DiscoveryConfig {
  return {
    version: settings.version,
    scales: settings.scales_json ?? {},
    modules: modules.map(rowToModuleConfig),
    combinedProfiles: settings.combined_profiles_json ?? [],
    scoringRules: settings.scoring_rules_json ?? DEFAULT_SCORING_RULES,
  };
}

export function normalizeScoringRulesJson(raw: unknown): ScoringRulesConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return DEFAULT_SCORING_RULES;
  }
  const obj = raw as Record<string, unknown>;
  return {
    rating_1_5: {
      maxValue: Number(
        (obj.rating_1_5 as { maxValue?: number } | undefined)?.maxValue ??
          DEFAULT_SCORING_RULES.rating_1_5.maxValue,
      ),
    },
    forced_choice: {
      questionsPerPole: Number(
        (obj.forced_choice as { questionsPerPole?: number } | undefined)?.questionsPerPole ??
          DEFAULT_SCORING_RULES.forced_choice.questionsPerPole,
      ),
    },
    profile_match: {
      topCategoryBonus: Number(
        (obj.profile_match as { topCategoryBonus?: number } | undefined)?.topCategoryBonus ??
          DEFAULT_SCORING_RULES.profile_match.topCategoryBonus,
      ),
    },
    confidence: {
      strongMinGap: Number(
        (obj.confidence as { strongMinGap?: number } | undefined)?.strongMinGap ??
          DEFAULT_SCORING_RULES.confidence.strongMinGap,
      ),
      emergingMinGap: Number(
        (obj.confidence as { emergingMinGap?: number } | undefined)?.emergingMinGap ??
          DEFAULT_SCORING_RULES.confidence.emergingMinGap,
      ),
    },
    flags: {
      straightLiningMinRatio: Number(
        (obj.flags as { straightLiningMinRatio?: number } | undefined)?.straightLiningMinRatio ??
          DEFAULT_SCORING_RULES.flags.straightLiningMinRatio,
      ),
      neutralHeavyMinRatio: Number(
        (obj.flags as { neutralHeavyMinRatio?: number } | undefined)?.neutralHeavyMinRatio ??
          DEFAULT_SCORING_RULES.flags.neutralHeavyMinRatio,
      ),
      neutralValue: Number(
        (obj.flags as { neutralValue?: number } | undefined)?.neutralValue ??
          DEFAULT_SCORING_RULES.flags.neutralValue,
      ),
      lowVarianceRatingMaxSpread: Number(
        (obj.flags as { lowVarianceRatingMaxSpread?: number } | undefined)
          ?.lowVarianceRatingMaxSpread ?? DEFAULT_SCORING_RULES.flags.lowVarianceRatingMaxSpread,
      ),
      lowVarianceForcedScenarioMaxSpread: Number(
        (obj.flags as { lowVarianceForcedScenarioMaxSpread?: number } | undefined)
          ?.lowVarianceForcedScenarioMaxSpread ??
          DEFAULT_SCORING_RULES.flags.lowVarianceForcedScenarioMaxSpread,
      ),
    },
  };
}
