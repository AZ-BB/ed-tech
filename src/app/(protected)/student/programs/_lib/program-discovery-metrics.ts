const LEVEL_SCORES: Record<string, number> = {
  "very high": 5,
  high: 5,
  strong: 4,
  "medium-high": 4,
  "med-high": 4,
  medium: 3,
  moderate: 3,
  low: 2,
  "very low": 1,
};

export function metricToScore(value: string | null | undefined): number {
  if (!value?.trim()) return 0;
  const key = value.trim().toLowerCase();
  if (LEVEL_SCORES[key] !== undefined) return LEVEL_SCORES[key]!;
  if (key.includes("very high")) return 5;
  if (key.includes("high")) return 5;
  if (key.includes("strong")) return 4;
  if (key.includes("medium")) return 3;
  if (key.includes("low")) return 2;
  return 3;
}

export function skillLevelToPercent(level: string | undefined): number {
  const key = (level ?? "").trim().toLowerCase();
  if (key === "expert") return 92;
  if (key === "strong") return 80;
  if (key === "solid") return 70;
  if (key === "good") return 60;
  return 65;
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function isHighSalary(value: string | null | undefined): boolean {
  const score = metricToScore(value);
  return score >= 4;
}

export function isFutureProof(aiResilience: string | null | undefined): boolean {
  return metricToScore(aiResilience) >= 4;
}
