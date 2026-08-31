/**
 * Normalize a stored phone number to WhatsApp Cloud API `to` format:
 * digits only, E.164 without leading `+`.
 */
export function normalizePhoneForWhatsApp(
  raw: string | null | undefined,
): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  let digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  }

  if (!/^\d{8,15}$/.test(digits)) {
    return null;
  }

  return digits;
}
