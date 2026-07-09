export function parseSalaryAmount(value: string | undefined): number {
  if (!value) return 0;
  const normalized = value.toLowerCase().replace(/,/g, "");
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(k|m)?/);
  if (!match) return 0;
  const amount = Number.parseFloat(match[1] ?? "0");
  const unit = match[2];
  if (unit === "m") return amount * 1_000_000;
  if (unit === "k") return amount * 1_000;
  if (amount < 1000 && normalized.includes("k")) return amount * 1_000;
  return amount;
}

export function salaryBarWidth(
  value: string | undefined,
  max: number,
): number {
  if (!max) return 0;
  const amount = parseSalaryAmount(value);
  if (!amount) return 0;
  return Math.min(100, Math.round((amount / max) * 100));
}

export function groupSalaryRegionsBySubfield(
  regions: {
    subfield?: string;
    region: string;
    entry_salary?: string;
    mid_salary?: string;
    senior_salary?: string;
    demand?: string;
  }[],
): { subfield: string; rows: typeof regions }[] {
  const map = new Map<string, typeof regions>();
  for (const row of regions) {
    const key = row.subfield?.trim() || "General";
    const bucket = map.get(key) ?? [];
    bucket.push(row);
    map.set(key, bucket);
  }
  return [...map.entries()].map(([subfield, rows]) => ({ subfield, rows }));
}

export function badgeClassForMetric(value: string): string {
  const v = value.toLowerCase();
  if (v.includes("high") || v.includes("very")) return "badgeHigh";
  if (v.includes("strong")) return "badgeStrong";
  return "badgeMedhigh";
}
