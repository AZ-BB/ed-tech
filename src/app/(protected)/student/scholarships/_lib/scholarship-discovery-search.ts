import type { Scholarship } from "../_components/types";

/** Substring search over common fields; server discovery mirrors this in `rpc_scholarships_discovery_page` (SQL `LIKE`). */
export function scholarshipMatchesQuery(s: Scholarship, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    s.name,
    s.provider,
    s.country,
    s.shortSummary,
    s.eligSummary,
    s.degreeLevels,
    s.fieldsOfStudy,
    s.academicElig,
    s.englishReq,
    s.otherElig,
    s.applicationMethod,
    s.importantNotes,
    s.type,
    s.competition,
    s.deadline,
    s.destinations.join(" "),
    s.eligibleNationalities.join(" "),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}
