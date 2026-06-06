const amountFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function formatAmountPerYear(amount: number): string {
  return `${amountFormatter.format(amount)}/yr`;
}

function formatAmountLiving(amount: number): string {
  return `~${amountFormatter.format(amount)} / year`;
}

/** Prefer stored display text; otherwise format the numeric amount. */
export function tuitionCardLabel(
  display: string | null | undefined,
  amount: number | null,
): string {
  const text = display?.trim()
  if (text) return text
  if (amount == null || Number.isNaN(amount)) return "—"
  return formatAmountPerYear(amount)
}

/** Detail page tuition line (may include richer copy from import). */
export function tuitionDetailLabel(
  display: string | null | undefined,
  amount: number | null,
): string {
  const text = display?.trim()
  if (text) return text
  if (amount == null || Number.isNaN(amount)) return "—"
  return formatAmountPerYear(amount)
}

export function tuitionSentenceLabel(
  display: string | null | undefined,
  amount: number | null,
): string {
  const text = display?.trim()
  if (text) return text
  if (amount == null || Number.isNaN(amount)) {
    return "Contact the university — varies by program"
  }
  return `${amountFormatter.format(amount)} per year`
}

export function livingCostLabel(
  display: string | null | undefined,
  amount: number | null,
): string {
  const text = display?.trim()
  if (text) return text
  if (amount == null || Number.isNaN(amount)) return "—"
  return formatAmountLiving(amount)
}
