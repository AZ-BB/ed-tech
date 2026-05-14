/** IELTS overall band range (0–9, half-band steps). */
export const IELTS_SCORE_MIN = 0;
export const IELTS_SCORE_MAX = 9;

/** TOEFL iBT total score range. */
export const TOEFL_SCORE_MIN = 0;
export const TOEFL_SCORE_MAX = 120;

/** Allow digits and at most one decimal point while typing. Clamp integer part to 9. */
export function sanitizeIeltsScoreInput(raw: string): string {
  let cleaned = raw.replace(/[^0-9.]/g, "");
  const dotIdx = cleaned.indexOf(".");
  if (dotIdx !== -1) {
    cleaned = cleaned.slice(0, dotIdx + 1) + cleaned.slice(dotIdx + 1).replace(/\./g, "");
    cleaned = cleaned.slice(0, dotIdx + 2);
  }
  if (!cleaned || cleaned === ".") return cleaned;
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n)) return "";
  if (n > IELTS_SCORE_MAX) return String(IELTS_SCORE_MAX);
  return cleaned;
}

/** Digits-only TOEFL iBT total: clamp to max while typing. */
export function sanitizeToeflScoreInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  let n = parseInt(digits, 10);
  if (!Number.isFinite(n)) return "";
  if (n > TOEFL_SCORE_MAX) n = TOEFL_SCORE_MAX;
  return String(n);
}

/** Snap IELTS to nearest valid half-band on blur. */
export function clampIeltsScoreOnBlur(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return "";
  const clamped = Math.min(IELTS_SCORE_MAX, Math.max(IELTS_SCORE_MIN, n));
  const snapped = Math.round(clamped * 2) / 2;
  return snapped % 1 === 0 ? String(snapped) + ".0" : String(snapped);
}

/** Clamp TOEFL iBT into valid range on blur. */
export function clampToeflScoreOnBlur(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  const n = parseInt(s, 10);
  if (!Number.isFinite(n)) return "";
  if (n < TOEFL_SCORE_MIN) return String(TOEFL_SCORE_MIN);
  if (n > TOEFL_SCORE_MAX) return String(TOEFL_SCORE_MAX);
  return String(n);
}

/** Build a legacy `english_test_scores` summary from the two dedicated columns. */
export function formatLegacyEnglishSummary(
  ielts: string,
  toefl: string,
): string | null {
  const parts: string[] = [];
  const i = ielts.trim();
  const t = toefl.trim();
  if (i) parts.push(`IELTS ${i}`);
  if (t) parts.push(`TOEFL ${t}`);
  return parts.length ? parts.join(" · ") : null;
}

/** Hydrate IELTS / TOEFL from legacy free-text when new columns are empty. */
export function parseLegacyEnglishScores(
  combined: string | null | undefined,
): { ielts: string; toefl: string } {
  if (!combined?.trim()) return { ielts: "", toefl: "" };
  const t = combined.trim();
  const ieltsM = t.match(/\bIELTS\b[:\s]*([0-9]+(?:\.[0-9])?)\b/i);
  const toeflM = t.match(/\bTOEFL\b[:\s]*([0-9]{1,3})\b/i);
  if (ieltsM || toeflM) {
    return { ielts: ieltsM?.[1] ?? "", toefl: toeflM?.[1] ?? "" };
  }
  const nums = t.match(/[0-9]+(?:\.[0-9])?/g);
  if (!nums?.length) return { ielts: "", toefl: "" };
  if (nums.length === 1) {
    const n = parseFloat(nums[0]);
    if (n >= IELTS_SCORE_MIN && n <= IELTS_SCORE_MAX) return { ielts: nums[0], toefl: "" };
    if (n >= TOEFL_SCORE_MIN && n <= TOEFL_SCORE_MAX) return { ielts: "", toefl: nums[0] };
    return { ielts: "", toefl: "" };
  }
  const a = parseFloat(nums[0]!);
  const b = parseFloat(nums[1]!);
  if (a <= IELTS_SCORE_MAX && b > IELTS_SCORE_MAX)
    return { ielts: nums[0]!, toefl: String(Math.round(b)) };
  if (b <= IELTS_SCORE_MAX && a > IELTS_SCORE_MAX)
    return { ielts: nums[1]!, toefl: String(Math.round(a)) };
  return { ielts: nums[0]!, toefl: nums[1]! };
}
