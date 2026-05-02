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
  const natN =
    !nat?.trim() || nat.trim().toLowerCase() === "any"
      ? "any"
      : nat.trim().toLowerCase();
  const destTrim = dest?.trim() ?? "";
  const destN =
    !destTrim || destTrim.toLowerCase() === "any" ? "any" : destTrim;
  const covN =
    !cov?.trim() || cov.trim().toLowerCase() === "any"
      ? "any"
      : cov.trim().toLowerCase();

  return list.filter((s) => {
    if (natN !== "any" && !matchesNationality(natN, s.eligibleNationalities))
      return false;
    if (destN !== "any") {
      const dests = s.destinations;
      if (
        !dests.includes(destN) &&
        !dests.includes("Global") &&
        !dests.includes("Multiple")
      ) {
        return false;
      }
    }
    if (covN !== "any" && s.coverage !== covN) return false;
    return true;
  });
}
