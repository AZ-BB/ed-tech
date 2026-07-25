/** Code-based Arabic labels for the four intake seasons (no AI translation). */

const SEASON_LABELS: Record<string, string> = {
  fall: "خريف",
  autumn: "خريف",
  spring: "ربيع",
  summer: "صيف",
  winter: "شتاء",
};

const SEASON_PATTERN = /\b(fall|autumn|spring|summer|winter)\b/gi;

function translateSeasonToken(token: string): string {
  const key = token.trim().toLowerCase();
  return SEASON_LABELS[key] ?? token;
}

function translateIntakeSegment(segment: string): string {
  return segment.replace(SEASON_PATTERN, (match) => translateSeasonToken(match));
}

/**
 * Translates intake strings by replacing season names only.
 * Examples: "Fall, Spring" → "خريف، ربيع"; "Fall 2026" → "خريف 2026"
 */
export function translateIntakesToArabic(intakes: string | null | undefined): string | null {
  const trimmed = intakes?.trim();
  if (!trimmed) return null;

  const parts = trimmed
    .split(/\s*(?:[,;/]|(?:\s+and\s+))\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return null;

  const translated = parts.map(translateIntakeSegment);
  return translated.join("، ");
}
