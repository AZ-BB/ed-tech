import type { RankedCount } from "./report-types";

export type AdminReportShortlistTopStats = {
  topUniversities: RankedCount[];
  topDestinations: RankedCount[];
  topScholarships: RankedCount[];
  shortlistRowCount: number;
};

function parseList(value: unknown): RankedCount[] {
  if (!Array.isArray(value)) return [];
  const out: RankedCount[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const label = typeof row.label === "string" ? row.label.trim() : "";
    const countValue =
      typeof row.count === "number"
        ? row.count
        : typeof row.count === "string"
          ? Number(row.count)
          : NaN;
    if (!label || !Number.isFinite(countValue)) continue;
    out.push({ label, count: Math.trunc(countValue) });
  }
  return out;
}

export function parseAdminReportShortlistTopStats(
  raw: unknown,
): AdminReportShortlistTopStats {
  const empty: AdminReportShortlistTopStats = {
    topUniversities: [],
    topDestinations: [],
    topScholarships: [],
    shortlistRowCount: 0,
  };
  if (!raw || typeof raw !== "object") return empty;
  const o = raw as Record<string, unknown>;
  const rawCount = o.shortlist_row_count;
  const shortlistRowCount =
    typeof rawCount === "number"
      ? rawCount
      : typeof rawCount === "string"
        ? Number(rawCount)
        : NaN;
  return {
    topUniversities: parseList(o.universities),
    topDestinations: parseList(o.destinations),
    topScholarships: parseList(o.scholarships),
    shortlistRowCount: Number.isFinite(shortlistRowCount)
      ? Math.trunc(shortlistRowCount)
      : 0,
  };
}
