import "server-only";

import { createSupabaseSecretClient } from "@/utils/supabase-server";

import { calculatePayoutAmount } from "./types";

export async function createAdvisorPayoutForPayment(
  paymentId: number,
): Promise<void> {
  const secret = await createSupabaseSecretClient();

  const { data: payment, error: paymentErr } = await secret
    .from("payments")
    .select(
      "id, amount, application_id, requested_by_type, requested_by_advisor_id, status",
    )
    .eq("id", paymentId)
    .maybeSingle();

  if (paymentErr || !payment) {
    console.error("[createAdvisorPayoutForPayment] payment", paymentErr);
    return;
  }

  if (payment.status !== "paid") return;
  if (payment.requested_by_type !== "advisor") return;
  if (!payment.requested_by_advisor_id) return;

  const { data: existing } = await secret
    .from("advisor_payouts")
    .select("id")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (existing) return;

  const { data: advisor, error: advisorErr } = await secret
    .from("advisors")
    .select("id, payout_percentage")
    .eq("id", payment.requested_by_advisor_id)
    .maybeSingle();

  if (advisorErr || !advisor) {
    console.error("[createAdvisorPayoutForPayment] advisor", advisorErr);
    return;
  }

  const percentage = advisor.payout_percentage ?? 0;
  if (percentage <= 0) return;

  const amount = calculatePayoutAmount(payment.amount, percentage);
  const now = new Date().toISOString();

  const { error: insertErr } = await secret.from("advisor_payouts").insert({
    advisor_id: advisor.id,
    payment_id: paymentId,
    application_id: payment.application_id,
    percentage,
    amount,
    status: "pending",
    created_at: now,
    updated_at: now,
  });

  if (insertErr) {
    console.error("[createAdvisorPayoutForPayment] insert", insertErr);
  }
}
