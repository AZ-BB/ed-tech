import {
  COUNTRIES,
  getCountryNameByAlpha2,
  isValidAlpha2Code,
} from "@/lib/countries";

/**
 * Coerce legacy `preferred_destinations` (free text or DB country names) toward
 * ISO 3166-1 alpha-2 codes. Unknown tokens are kept so nothing is dropped silently.
 */
export function normalizePreferredDestinationsForEditor(
  raw: string[] | null | undefined,
  dbCountries: readonly { id: string; name: string }[],
): string[] {
  const dbNameToId = new Map<string, string>();
  for (const c of dbCountries) {
    const id = c.id.trim().toUpperCase();
    if (id.length === 2) dbNameToId.set(c.name.trim().toLowerCase(), id);
  }

  const isoNameToAlpha = new Map<string, string>();
  for (const c of COUNTRIES) {
    isoNameToAlpha.set(c.name.trim().toLowerCase(), c.alpha2);
  }

  const out: string[] = [];
  const seen = new Set<string>();

  for (const item of raw ?? []) {
    const t = item?.trim();
    if (!t) continue;

    const u = t.toUpperCase();
    let resolved: string | null = null;

    if (u.length === 2 && isValidAlpha2Code(u)) {
      resolved = u;
    } else {
      const byDbName = dbNameToId.get(t.toLowerCase());
      if (byDbName) resolved = byDbName;
      else {
        const byIsoName = isoNameToAlpha.get(t.toLowerCase());
        if (byIsoName) resolved = byIsoName;
      }
    }

    const value = resolved ?? t;
    const dedupeKey = resolved ? resolved : t.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push(value);
  }

  return out;
}

export function labelPreferredDestinationEntry(value: string): string {
  const t = value.trim();
  if (/^[a-z]{2}$/i.test(t) && isValidAlpha2Code(t)) {
    return getCountryNameByAlpha2(t.toUpperCase()) ?? t.toUpperCase();
  }
  return t;
}

export function formatPreferredDestinationsForDisplay(
  raw: string[] | null | undefined,
): string {
  if (!raw?.length) return "—";
  return raw.map((x) => labelPreferredDestinationEntry(x)).join(", ");
}
