/** Digital SAT total score range (College Board). */
export const SAT_SCORE_MIN = 400;
export const SAT_SCORE_MAX = 1600;

/** ACT composite integer range. */
export const ACT_SCORE_MIN = 1;
export const ACT_SCORE_MAX = 36;

/** Digits-only SAT: clamp to max while typing; min enforced on blur. */
export function sanitizeSatScoreInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  let n = parseInt(digits, 10);
  if (!Number.isFinite(n)) return "";
  if (n > SAT_SCORE_MAX) n = SAT_SCORE_MAX;
  return String(n);
}

/** Digits-only ACT composite: clamp 1–36. */
export function sanitizeActScoreInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  let n = parseInt(digits, 10);
  if (!Number.isFinite(n)) return "";
  if (n > ACT_SCORE_MAX) n = ACT_SCORE_MAX;
  return String(n);
}

/** After blur, snap SAT into valid range if user entered a non-zero value below min. */
export function clampSatScoreOnBlur(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  const n = parseInt(s, 10);
  if (!Number.isFinite(n)) return "";
  if (n < SAT_SCORE_MIN) return String(SAT_SCORE_MIN);
  if (n > SAT_SCORE_MAX) return String(SAT_SCORE_MAX);
  return String(n);
}

export function clampActScoreOnBlur(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  const n = parseInt(s, 10);
  if (!Number.isFinite(n)) return "";
  if (n < ACT_SCORE_MIN) return String(ACT_SCORE_MIN);
  if (n > ACT_SCORE_MAX) return String(ACT_SCORE_MAX);
  return String(n);
}

export function formatLegacySatActSummary(
  sat: string,
  act: string,
): string | null {
  const parts: string[] = [];
  const st = sat.trim();
  const at = act.trim();
  if (st) parts.push(`SAT ${st}`);
  if (at) parts.push(`ACT ${at}`);
  return parts.length ? parts.join(" · ") : null;
}

/** Hydrate UI from DB when new columns are empty. */
export function parseLegacySatActScores(
  combined: string | null | undefined,
): { sat: string; act: string } {
  if (!combined?.trim()) return { sat: "", act: "" };
  const t = combined.trim();
  const satM = t.match(/\bSAT\b[:\s]*([0-9]{3,4})\b/i);
  const actM = t.match(/\bACT\b[:\s]*([0-9]{1,2})\b/i);
  if (satM || actM) {
    return { sat: satM?.[1] ?? "", act: actM?.[1] ?? "" };
  }
  const nums = t.match(/[0-9]+/g);
  if (!nums?.length) return { sat: "", act: "" };
  if (nums.length === 1) {
    const n = parseInt(nums[0], 10);
    if (n >= SAT_SCORE_MIN && n <= SAT_SCORE_MAX) return { sat: nums[0], act: "" };
    if (n >= ACT_SCORE_MIN && n <= ACT_SCORE_MAX) return { sat: "", act: nums[0] };
    return { sat: "", act: "" };
  }
  const a = parseInt(nums[0]!, 10);
  const b = parseInt(nums[1]!, 10);
  if (a >= SAT_SCORE_MIN && a <= SAT_SCORE_MAX)
    return { sat: nums[0]!, act: b >= ACT_SCORE_MIN && b <= ACT_SCORE_MAX ? nums[1]! : "" };
  if (b >= SAT_SCORE_MIN && b <= SAT_SCORE_MAX)
    return { sat: nums[1]!, act: a >= ACT_SCORE_MIN && a <= ACT_SCORE_MAX ? nums[0]! : "" };
  return { sat: nums[0]!, act: nums[1]! };
}
