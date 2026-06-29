import { getCountryNameByAlpha2 } from "@/lib/countries";

export type AmbassadorBylineSource = {
  universityName: string | null;
  joinedUniversityName?: string | null;
  nationalityCountryCode: string;
};

export function resolveAmbassadorUniversityName(
  ambassador: AmbassadorBylineSource,
): string {
  const fromJoin = ambassador.joinedUniversityName?.trim();
  if (fromJoin && fromJoin.length > 0) return fromJoin;
  const fallback = ambassador.universityName?.trim();
  if (fallback && fallback.length > 0) return fallback;
  return "University TBD";
}

export function buildAmbassadorByline(
  ambassador: AmbassadorBylineSource,
  override?: string | null,
): string {
  const trimmedOverride = override?.trim();
  if (trimmedOverride) return trimmedOverride;

  const university = resolveAmbassadorUniversityName(ambassador);
  const nationality =
    getCountryNameByAlpha2(ambassador.nationalityCountryCode) ??
    ambassador.nationalityCountryCode;

  return `Now at ${university} · from ${nationality}`;
}

export function ambassadorInitials(firstName: string, lastName: string): string {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);
  const combined = `${first}${last}`.toUpperCase();
  return combined || "UA";
}
