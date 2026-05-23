/** Main pool + extra pool balances (null when neither is configured). */
export function schoolAvailableCreditPool(
  creditPool: number | null | undefined,
  extraCredits: number | null | undefined,
): number | null {
  if (creditPool == null && extraCredits == null) return null;
  return Math.max(0, (creditPool ?? 0) + (extraCredits ?? 0));
}

export function creditLimitExceedsPoolMessage(
  limit: number,
  availablePool: number | null,
  label = "Credit limit",
): string | null {
  if (availablePool == null) return null;
  if (limit > availablePool) {
    return `${label} cannot exceed the available credit pool (${availablePool.toLocaleString()}).`;
  }
  return null;
}
