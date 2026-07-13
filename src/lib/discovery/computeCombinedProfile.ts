import type {
  CombinedProfileConfig,
  CombinedProfileResult,
  DiscoveryConfig,
  EarlySignal,
  ModuleResult,
} from "@/types/discovery";
import { getStudentDiscoveryModuleCount } from "@/lib/discovery/discovery-student-modules";

const EXPLORER_PROFILE_ID = "dir-explorer";

function buildEarlySignals(
  config: DiscoveryConfig,
  moduleResults: ModuleResult[],
): EarlySignal[] {
  return moduleResults.map((result) => {
    const module = config.modules.find((m) => m.moduleId === result.moduleId);
    return {
      moduleId: result.moduleId,
      moduleTitle: module?.title ?? result.moduleId,
      topCategory: result.topCategories[0]?.category ?? "",
      confidence: result.confidence,
    };
  });
}

export function computeCombinedProfile(
  config: DiscoveryConfig,
  moduleResults: ModuleResult[],
): CombinedProfileResult | null {
  if (moduleResults.length === 0) return null;

  const totalModules = getStudentDiscoveryModuleCount(config);

  const allTopCategories: string[] = [];
  for (const result of moduleResults) {
    for (const tc of result.topCategories) {
      allTopCategories.push(tc.category);
    }
  }

  let bestProfile: CombinedProfileConfig | null = null;
  let bestScore = -1;

  for (const cp of config.combinedProfiles) {
    let maxTriggerScore = 0;
    for (const triggerSet of cp.triggers) {
      const matches = triggerSet.filter((cat) => allTopCategories.includes(cat)).length;
      if (matches > maxTriggerScore) maxTriggerScore = matches;
    }
    if (maxTriggerScore > bestScore) {
      bestScore = maxTriggerScore;
      bestProfile = cp;
    }
  }

  if (!bestProfile || bestScore <= 0) {
    bestProfile =
      config.combinedProfiles.find((p) => p.profile_id === EXPLORER_PROFILE_ID) ??
      config.combinedProfiles.find((p) => p.triggers.length === 0) ??
      ({
        profile_id: EXPLORER_PROFILE_ID,
        title: "Creative & Communication Direction",
        summary:
          "Your signals are spread across several strong directions — that's a real advantage.",
        triggers: [],
      } satisfies CombinedProfileConfig);
  }

  return {
    profile: bestProfile,
    completedCount: moduleResults.length,
    totalModules,
    moduleResults,
    earlySignals: buildEarlySignals(config, moduleResults),
  };
}
