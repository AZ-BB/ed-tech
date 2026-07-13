import { calculateConfidence } from "@/lib/discovery/calculateConfidence";
import { calculateFlags } from "@/lib/discovery/calculateFlags";
import { matchProfiles } from "@/lib/discovery/matchProfiles";
import { scoreForcedChoiceModule } from "@/lib/discovery/scoreForcedChoice";
import { scoreRatingModule } from "@/lib/discovery/scoreRating";
import { scoreScenarioModule } from "@/lib/discovery/scoreScenario";
import type { DiscoveryConfig, DiscoveryModuleConfig, ModuleResult } from "@/types/discovery";

export function scoreModule(
  config: DiscoveryConfig,
  moduleId: string,
  answers: Record<string, number | string>,
  completedAt: string,
): ModuleResult {
  const module = config.modules.find((m) => m.moduleId === moduleId);
  if (!module) {
    throw new Error(`Unknown module: ${moduleId}`);
  }

  const rules = config.scoringRules;
  let sortedScores;

  switch (module.answerFormat) {
    case "interest":
    case "frequency":
    case "importance":
    case "preference":
      sortedScores = scoreRatingModule(module, answers, rules);
      break;
    case "forced":
      sortedScores = scoreForcedChoiceModule(module, answers, rules);
      break;
    case "scenario":
      sortedScores = scoreScenarioModule(module, answers);
      break;
    default:
      sortedScores = scoreRatingModule(module, answers, rules);
  }

  const topCategories = sortedScores.slice(0, 3);
  const confidence = calculateConfidence(sortedScores, rules);
  const flags = calculateFlags(module.answerFormat, answers, topCategories, confidence, rules);
  const { bestProfile, topProfiles } = matchProfiles(module.profiles, sortedScores, rules);

  return {
    moduleId: module.moduleId,
    profile: bestProfile,
    topProfiles,
    topCategories,
    allScores: sortedScores,
    confidence,
    flags,
    completedAt,
  };
}

export function getModuleFromConfig(
  config: DiscoveryConfig,
  moduleId: string,
): DiscoveryModuleConfig | undefined {
  return config.modules.find((m) => m.moduleId === moduleId);
}
