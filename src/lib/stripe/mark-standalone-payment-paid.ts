import "server-only";

import { createSupabaseSecretClient } from "@/utils/supabase-server";

export async function markStandalonePaymentPaid(
  standalonePaymentId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = await createSupabaseSecretClient();
  const now = new Date().toISOString();

  const { data: payment, error: fetchErr } = await secret
    .from("standalone_payments")
    .select("id, status")
    .eq("id", standalonePaymentId)
    .maybeSingle();

  if (fetchErr || !payment) {
    console.error("[markStandalonePaymentPaid] fetch", fetchErr);
    return { ok: false, error: "Payment not found." };
  }

  if (payment.status === "paid") {
    return { ok: true };
  }

  if (payment.status !== "pending") {
    return { ok: false, error: "Payment is not pending." };
  }

  const { data: updated, error: updateErr } = await secret
    .from("standalone_payments")
    .update({
      status: "paid",
      paid_at: now,
      updated_at: now,
    })
    .eq("id", standalonePaymentId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateErr) {
    console.error("[markStandalonePaymentPaid] update", updateErr);
    return { ok: false, error: "Could not update payment status." };
  }

  if (!updated) {
    const { data: current } = await secret
      .from("standalone_payments")
      .select("status")
      .eq("id", standalonePaymentId)
      .maybeSingle();

    if (current?.status === "paid") {
      return { ok: true };
    }

    return { ok: false, error: "Payment is not pending." };
  }

  return { ok: true };
}
