import type { ActivityShortlistedUniversity } from "./my-applications-types";

type UniEmbed = {
  id: string;
  name: string;
  city: string;
  country_code: string;
  method: string | null;
  deadline_date: string | null;
  countries: { name: string } | null;
} | null;

export type ActivityShortlistQueryRow = {
  id: number;
  created_at: string | null;
  uni_id: string | null;
  universities: UniEmbed;
};

export function normalizeActivityShortlistUniversities(
  rows: ActivityShortlistQueryRow[] | null,
): ActivityShortlistedUniversity[] {
  if (!rows?.length) return [];

  const bestByUni = new Map<
    string,
    { activityId: number; createdAt: string | null; uni: NonNullable<UniEmbed> }
  >();

  for (const row of rows) {
    if (!row.uni_id || !row.universities) continue;
    const u = row.universities;
    const prev = bestByUni.get(row.uni_id);
    const t = row.created_at ? Date.parse(row.created_at) : 0;
    const prevT = prev?.createdAt ? Date.parse(prev.createdAt) : 0;
    if (!prev || t >= prevT) {
      bestByUni.set(row.uni_id, { activityId: row.id, createdAt: row.created_at, uni: u });
    }
  }

  const out: ActivityShortlistedUniversity[] = Array.from(bestByUni.values()).map(({ activityId, createdAt, uni }) => ({
    activityId,
    uniId: uni.id,
    createdAt,
    name: uni.name,
    city: uni.city,
    countryName: uni.countries?.name ?? null,
    countryCode: uni.country_code,
    method: uni.method,
    deadlineDate: uni.deadline_date,
  }));

  out.sort((a, b) => {
    const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
    return tb - ta;
  });

  return out;
}
