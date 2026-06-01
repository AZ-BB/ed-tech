export type AdminDashboardShortlistTopStats = {
  topUniversities: { label: string; count: number }[];
  topDestinations: { label: string; count: number }[];
  shortlistRowCount: number;
};

/** Parses JSON from `admin_dashboard_shortlist_top_stats` RPC. */
export function parseAdminDashboardShortlistTopStats(
  raw: unknown,
): AdminDashboardShortlistTopStats {
  const empty: AdminDashboardShortlistTopStats = {
    topUniversities: [],
    topDestinations: [],
    shortlistRowCount: 0,
  };

  if (!raw || typeof raw !== "object") return empty;
  const o = raw as Record<string, unknown>;

  const parseList = (value: unknown): { label: string; count: number }[] => {
    if (!Array.isArray(value)) return [];
    const out: { label: string; count: number }[] = [];
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
  };

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
    shortlistRowCount: Number.isFinite(shortlistRowCount)
      ? Math.trunc(shortlistRowCount)
      : 0,
  };
}
