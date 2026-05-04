/** ISO 3166-1 alpha-2 → regional indicator pair (e.g. GB → 🇬🇧). */
export function flagFromCountryCode(code: string | null | undefined): string {
  const c = String(code ?? "")
    .trim()
    .toUpperCase();
  if (c.length !== 2 || !/^[A-Z]{2}$/.test(c)) return "🌐";
  const A = 0x1f1e6;
  return (
    String.fromCodePoint(A + (c.charCodeAt(0) - 65)) +
    String.fromCodePoint(A + (c.charCodeAt(1) - 65))
  );
}
