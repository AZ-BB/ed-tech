import type { Scholarship } from "./types";

export const gccGroup = ["ae", "sa", "qa", "kw", "om", "bh"] as const;

export const menaGroup = [
  "ae",
  "sa",
  "qa",
  "kw",
  "om",
  "bh",
  "eg",
  "jo",
  "lb",
  "ps",
  "iq",
  "ma",
  "tn",
  "dz",
  "ly",
  "sd",
  "sy",
  "ye",
] as const;

const gccSet = new Set<string>(gccGroup);

const menaSet = new Set<string>(menaGroup);

export function matchesNationality(
  userNat: string,
  eligArr: string[],
): boolean {
  if (userNat === "any") return true;
  if (eligArr.includes("all")) return true;
  if (eligArr.includes(userNat)) return true;
  if (eligArr.includes("other")) return true;
  if (eligArr.includes("mena") && menaSet.has(userNat)) return true;
  if (eligArr.includes("gcc-all") && gccSet.has(userNat)) return true;
  if (eligArr.includes("eu-cit") && userNat === "eu-cit") return true;
  return false;
}

export function filterScholarships(
  list: Scholarship[],
  nat: string,
  dest: string,
  cov: string,
): Scholarship[] {
  return list.filter((s) => {
    if (nat !== "any" && !matchesNationality(nat, s.eligibleNationalities))
      return false;
    if (dest !== "any") {
      const dests = s.destinations;
      if (
        !dests.includes(dest) &&
        !dests.includes("Global") &&
        !dests.includes("Multiple")
      ) {
        return false;
      }
    }
    if (cov !== "any" && s.coverage !== cov) return false;
    return true;
  });
}

/** Same split as legacy HTML: GCC nationality-locked (≤3 codes) vs everything else */
export function splitGovernmentInternational(filtered: Scholarship[]) {
  const gov = filtered.filter(
    (s) =>
      s.eligibleNationalities.length <= 3 &&
      s.eligibleNationalities.some((n) => gccSet.has(n)),
  );
  const govIds = new Set(gov.map((x) => x.id));
  const other = filtered.filter((s) => !govIds.has(s.id));
  return { gov, other };
}
