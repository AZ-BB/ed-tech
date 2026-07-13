export type AnswerFormat =
  | "interest"
  | "frequency"
  | "importance"
  | "preference"
  | "forced"
  | "scenario";

export type ConfidenceLabel = "Strong signal" | "Emerging signal" | "Balanced profile";

export type ScaleId = "interest" | "frequency" | "importance" | "preference" | "forced";

export type DiscoveryScaleOption = {
  value: number;
  label: string;
};

export type DiscoveryScales = Partial<Record<ScaleId, DiscoveryScaleOption[]>>;

export type ForcedChoiceOption = {
  label: string;
  category: string;
};

export type ScenarioOption = {
  label: string;
  category: string;
};

export type DiscoveryQuestion =
  | {
      item_id: string;
      text: string;
      response_type: "rating_1_5";
      scale: ScaleId;
      category: string;
    }
  | {
      item_id: string;
      text: string;
      response_type: "forced_choice";
      optionA: ForcedChoiceOption;
      optionB: ForcedChoiceOption;
    }
  | {
      item_id: string;
      text: string;
      response_type: "scenario_select";
      options: ScenarioOption[];
    };

export type DiscoveryModuleProfile = {
  profile_id: string;
  title: string;
  matching_categories: string[];
  majors_strong: string[];
  majors_related: string[];
  majors_stretch: string[];
  careers: string[];
};

export type DiscoveryModuleContentJson = {
  categories: string[];
  questions: DiscoveryQuestion[];
  profiles: DiscoveryModuleProfile[];
};

export type DiscoveryModuleRow = {
  id: string;
  title: string;
  number: string;
  subtitle: string | null;
  description: string | null;
  answer_format: AnswerFormat;
  num_items: number;
  is_active: boolean;
  sort_order: number;
  content_json: DiscoveryModuleContentJson;
  updated_at: string;
  updated_by: string | null;
};

export type DiscoverySettingsRow = {
  id: string;
  scales_json: DiscoveryScales;
  combined_profiles_json: CombinedProfileConfig[];
  scoring_rules_json: ScoringRulesConfig;
  version: number;
  updated_at: string;
  updated_by: string | null;
};

export type CombinedProfileConfig = {
  profile_id: string;
  title: string;
  summary: string;
  triggers: string[][];
};

export type ScoringRulesConfig = {
  rating_1_5: { maxValue: number };
  forced_choice: { questionsPerPole: number };
  profile_match: { topCategoryBonus: number };
  confidence: { strongMinGap: number; emergingMinGap: number };
  flags: {
    straightLiningMinRatio: number;
    neutralHeavyMinRatio: number;
    neutralValue: number;
    lowVarianceRatingMaxSpread: number;
    lowVarianceForcedScenarioMaxSpread: number;
  };
};

export type PortableDiscoveryTest = {
  module_id: string;
  number: string;
  title: string;
  answer_format: AnswerFormat;
  num_items: number;
  categories: string[];
  questions: DiscoveryQuestion[];
  profiles: DiscoveryModuleProfile[];
};

export type PortableDiscoveryDocument = {
  scales: DiscoveryScales;
  tests: PortableDiscoveryTest[];
  combined_profiles: CombinedProfileConfig[];
  scoring_rules: ScoringRulesConfig;
};

export type DiscoveryConfig = {
  version: number;
  scales: DiscoveryScales;
  modules: DiscoveryModuleConfig[];
  combinedProfiles: CombinedProfileConfig[];
  scoringRules: ScoringRulesConfig;
};

export type DiscoveryModuleConfig = {
  moduleId: string;
  title: string;
  number: string;
  subtitle: string | null;
  description: string | null;
  answerFormat: AnswerFormat;
  numItems: number;
  isActive: boolean;
  sortOrder: number;
  categories: string[];
  questions: DiscoveryQuestion[];
  profiles: DiscoveryModuleProfile[];
};

export type ModuleAnswer = {
  questionId: string;
  answer: number | string;
};

export type CategoryScore = {
  category: string;
  score: number;
  pct: number;
};

export type ProfileResult = DiscoveryModuleProfile;

export type ModuleResultFlags = {
  straightLining: boolean;
  neutralHeavy: boolean;
  lowVariance: boolean;
};

export type ModuleResult = {
  moduleId: string;
  profile: ProfileResult;
  topProfiles: ProfileResult[];
  topCategories: CategoryScore[];
  allScores: CategoryScore[];
  confidence: ConfidenceLabel;
  flags: ModuleResultFlags;
  completedAt: string;
};

export type EarlySignal = {
  moduleId: string;
  moduleTitle: string;
  topCategory: string;
  confidence: ConfidenceLabel;
};

export type CombinedProfileResult = {
  profile: CombinedProfileConfig;
  completedCount: number;
  totalModules: number;
  moduleResults: ModuleResult[];
  earlySignals: EarlySignal[];
};

export type StudentDiscoveryProfileResponse = {
  completedModules: string[];
  earlySignals: EarlySignal[];
  combinedProfile: CombinedProfileConfig | null;
  moduleResults: ModuleResult[];
  completedCount: number;
  totalModules: number;
};

export type ValidationError = {
  path: string;
  message: string;
};

export const DEFAULT_SCORING_RULES: ScoringRulesConfig = {
  rating_1_5: { maxValue: 5 },
  forced_choice: { questionsPerPole: 3 },
  profile_match: { topCategoryBonus: 10 },
  confidence: { strongMinGap: 18, emergingMinGap: 8 },
  flags: {
    straightLiningMinRatio: 0.8,
    neutralHeavyMinRatio: 0.5,
    neutralValue: 3,
    lowVarianceRatingMaxSpread: 6,
    lowVarianceForcedScenarioMaxSpread: 12,
  },
};
