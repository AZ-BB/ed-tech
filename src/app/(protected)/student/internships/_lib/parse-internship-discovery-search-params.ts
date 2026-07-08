export const INTERNSHIP_LOC_CODES = [
  "AE",
  "SA",
  "QA",
  "KW",
  "BH",
  "OM",
  "JO",
  "LB",
  "EG",
] as const;

export type InternshipLocFilter =
  | "any"
  | (typeof INTERNSHIP_LOC_CODES)[number]
  | "MENA"
  | "Remote";

export type InternshipPayFilter = "any" | "paid" | "free";

export type InternshipDiscoveryResolvedQuery = {
  loc: InternshipLocFilter;
  pay: InternshipPayFilter;
  favouritesOnly: boolean;
  detail: string | null;
  page: number;
};

function pick(
  sp: Record<string, string | string[] | undefined>,
  key: string,
  fallback: string,
): string {
  const v = sp[key];
  const s = Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
  return typeof s === "string" ? s : fallback;
}

const LOC_SET = new Set<string>([...INTERNSHIP_LOC_CODES, "MENA", "Remote"]);

function parseLoc(raw: string): InternshipLocFilter {
  const t = raw.trim();
  if (!t || t.toLowerCase() === "any") return "any";
  if (t.toLowerCase() === "mena") return "MENA";
  if (t.toLowerCase() === "remote") return "Remote";
  const upper = t.toUpperCase();
  if (
    LOC_SET.has(upper) &&
    INTERNSHIP_LOC_CODES.includes(
      upper as (typeof INTERNSHIP_LOC_CODES)[number],
    )
  ) {
    return upper as (typeof INTERNSHIP_LOC_CODES)[number];
  }
  return "any";
}

function parsePay(raw: string): InternshipPayFilter {
  const t = raw.trim().toLowerCase();
  if (!t || t === "any") return "any";
  if (t === "paid") return "paid";
  if (t === "free") return "free";
  return "any";
}

function parsePage(raw: string): number {
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function parseFavourites(raw: string): boolean {
  const t = raw.trim().toLowerCase();
  return t === "1" || t === "true" || t === "yes";
}

export function parseInternshipDiscoverySearchParams(
  sp: Record<string, string | string[] | undefined>,
): InternshipDiscoveryResolvedQuery {
  const detailRaw = pick(sp, "detail", "").trim();
  return {
    loc: parseLoc(pick(sp, "loc", "")),
    pay: parsePay(pick(sp, "pay", "")),
    favouritesOnly: parseFavourites(pick(sp, "favourites", "")),
    detail: detailRaw.length ? detailRaw : null,
    page: parsePage(pick(sp, "page", "1")),
  };
}
