export function normalizeCountryAlpha2(code: string | null | undefined): string | null {
  const c = String(code ?? "")
    .trim()
    .toUpperCase();
  if (c.length !== 2 || !/^[A-Z]{2}$/.test(c)) return null;
  return c;
}

/** ISO 3166-1 alpha-2 PNG URL (works on Windows; emoji flags often render as "GB"). */
export function countryFlagImageUrl(
  code: string | null | undefined,
  width: 20 | 40 | 80 = 40,
): string | null {
  const c = normalizeCountryAlpha2(code);
  if (!c) return null;
  return `https://flagcdn.com/w${width}/${c.toLowerCase()}.png`;
}

/** ISO 3166-1 alpha-2 → regional indicator pair (e.g. GB → 🇬🇧). */
export function flagFromCountryCode(code: string | null | undefined): string {
  const c = normalizeCountryAlpha2(code);
  if (!c) return "🌐";
  const A = 0x1f1e6;
  return (
    String.fromCodePoint(A + (c.charCodeAt(0) - 65)) +
    String.fromCodePoint(A + (c.charCodeAt(1) - 65))
  );
}
