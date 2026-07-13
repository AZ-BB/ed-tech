import type { DiscoveryConfig, DiscoveryModuleConfig } from "@/types/discovery";

/** All discovery modules available to students (not gated by is_active). */
export function getStudentDiscoveryModules(
  config: DiscoveryConfig,
): DiscoveryModuleConfig[] {
  return [...config.modules].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getStudentDiscoveryModuleCount(config: DiscoveryConfig): number {
  return getStudentDiscoveryModules(config).length;
}
