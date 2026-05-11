export type SchoolShortlistTopStatsParsed = {
  topDestinations: { label: string; count: number }[];
  topPrograms: { label: string; count: number }[];
  shortlistRowCount: number;
};

/** Parses JSON from `school_dashboard_shortlist_top_stats` RPC. */
export function parseSchoolDashboardShortlistTopStats(
  raw: unknown,
): SchoolShortlistTopStatsParsed {
  const empty: SchoolShortlistTopStatsParsed = {
    topDestinations: [],
    topPrograms: [],
    shortlistRowCount: 0,
  };
  if (!raw || typeof raw !== "object") return empty;
  const o = raw as Record<string, unknown>;

  const parseList = (v: unknown): { label: string; count: number }[] => {
    if (!Array.isArray(v)) return [];
    const out: { label: string; count: number }[] = [];
    for (const item of v) {
      if (!item || typeof item !== "object") continue;
      const r = item as Record<string, unknown>;
      const label = typeof r.label === "string" ? r.label : "";
      const c =
        typeof r.count === "number"
          ? r.count
          : typeof r.count === "string"
            ? Number(r.count)
            : NaN;
      if (!label.trim() || !Number.isFinite(c)) continue;
      out.push({ label, count: Math.trunc(c) });
    }
    return out;
  };

  const src = o.shortlist_row_count;
  const shortlistRowCount =
    typeof src === "number" ? src : typeof src === "string" ? Number(src) : NaN;

  return {
    topDestinations: parseList(o.destinations),
    topPrograms: parseList(o.programs),
    shortlistRowCount: Number.isFinite(shortlistRowCount)
      ? Math.trunc(shortlistRowCount)
      : 0,
  };
}
