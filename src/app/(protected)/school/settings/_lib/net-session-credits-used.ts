export type CreditHistoryRow = {
  amount: number;
  status: string | null;
  type: string;
};

export type NetSessionCreditsByKind = {
  advisorUsedNet: number;
  ambassadorUsedNet: number;
  poolUsedNet: number;
};

/** Net advisor, ambassador, and pool credits (used − refunded) from `student_credits_history` rows. */
export function netSessionCreditsByKindFromRows(
  rows: CreditHistoryRow[] | null,
): NetSessionCreditsByKind {
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
  return {
    advisorUsedNet: Math.max(0, advUsed - advRef),
    ambassadorUsedNet: Math.max(0, ambUsed - ambRef),
    poolUsedNet: Math.max(0, poolUsed - poolRef),
  };
}

/** Net advisor + ambassador + pool ledger (base_credit, extra_credits) for UTC year-to-date. */
export function netSessionCreditsUsedFromRows(
  rows: CreditHistoryRow[] | null,
): number {
  const { advisorUsedNet, ambassadorUsedNet, poolUsedNet } =
    netSessionCreditsByKindFromRows(rows);
  return advisorUsedNet + ambassadorUsedNet + poolUsedNet;
}
