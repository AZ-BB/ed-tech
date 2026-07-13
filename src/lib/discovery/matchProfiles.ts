import type { CategoryScore, DiscoveryModuleProfile, ScoringRulesConfig } from "@/types/discovery";

export function matchProfiles(
  profiles: DiscoveryModuleProfile[],
  sortedScores: CategoryScore[],
  rules: ScoringRulesConfig,
): { bestProfile: DiscoveryModuleProfile; topProfiles: DiscoveryModuleProfile[] } {
  const topCatNames = sortedScores.slice(0, 3).map((s) => s.category);
  const topCategory = topCatNames[0];
  const bonus = rules.profile_match.topCategoryBonus;

  const ranked = profiles
    .map((profile) => {
      const matched = profile.matching_categories.map((mc) => {
        const found = sortedScores.find((s) => s.category === mc);
        return found ? found.pct : 0;
      });
      const base = matched.length
        ? matched.reduce((sum, value) => sum + value, 0) / matched.length
        : 0;
      let score = base;
      if (topCategory && profile.matching_categories.includes(topCategory)) {
        score += bonus;
      }
      return { profile, score };
    })
    .sort((a, b) => b.score - a.score);

  const bestProfile = ranked[0]?.profile ?? profiles[0];
  const topProfiles = ranked.slice(0, 3).map((r) => r.profile);

  return { bestProfile, topProfiles };
}
