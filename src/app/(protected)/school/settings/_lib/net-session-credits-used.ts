/** Net advisor + ambassador + pool ledger (base_credit, extra_credits) for UTC year-to-date. */
export function netSessionCreditsUsedFromRows(
  rows: { amount: number; status: string | null; type: string }[] | null,
): number {
  let advUsed = 0;
  let advRef = 0;
  let ambUsed = 0;
  let ambRef = 0;
  let poolUsed = 0;
  let poolRef = 0;
  for (const r of rows ?? []) {
    const amt =
      typeof r.amount === "number" && Number.isFinite(r.amount) ? r.amount : 0;
    const isRef = r.status === "refunded";
    if (r.type === "advisor") {
      if (isRef) advRef += amt;
      else advUsed += amt;
    } else if (r.type === "ambassador") {
      if (isRef) ambRef += amt;
      else ambUsed += amt;
    } else if (r.type === "base_credit" || r.type === "extra_credits") {
      if (isRef) poolRef += amt;
      else poolUsed += amt;
    }
  }
  return (
    Math.max(0, advUsed - advRef) +
    Math.max(0, ambUsed - ambRef) +
    Math.max(0, poolUsed - poolRef)
  );
}
