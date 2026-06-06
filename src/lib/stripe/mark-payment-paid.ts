import "server-only";

import {
  APPLICATION_ACTIVITY_ENTITY_TYPE,
  applicationActivityEntityId,
} from "@/lib/application-activity-log";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export async function markApplicationPaymentPaid(
  paymentId: number,
  options?: { message?: string; studentId?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = await createSupabaseSecretClient();
  const now = new Date().toISOString();

  const { data: payment, error: fetchErr } = await secret
    .from("payments")
    .select("id, application_id, student_id, status")
    .eq("id", paymentId)
    .maybeSingle();

  if (fetchErr || !payment) {
    console.error("[markApplicationPaymentPaid] fetch", fetchErr);
    return { ok: false, error: "Payment not found." };
  }

  if (payment.status === "paid") {
    return { ok: true };
  }

  if (payment.status !== "pending") {
    return { ok: false, error: "Payment is not pending." };
  }

  const { data: updated, error: updateErr } = await secret
    .from("payments")
    .update({
      status: "paid",
      paid_at: now,
      updated_at: now,
    })
    .eq("id", paymentId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateErr) {
    console.error("[markApplicationPaymentPaid] update", updateErr);
    return { ok: false, error: "Could not update payment status." };
  }

  if (!updated) {
    const { data: current } = await secret
      .from("payments")
      .select("status")
      .eq("id", paymentId)
      .maybeSingle();

    if (current?.status === "paid") {
      return { ok: true };
    }

    return { ok: false, error: "Payment is not pending." };
  }

  const studentId = options?.studentId ?? payment.student_id;
  const message =
    options?.message ??
    `Application support deposit paid for application #${payment.application_id}.`;

  const { error: logErr } = await secret.from("acitivity_logs").insert({
    entitiy_type: APPLICATION_ACTIVITY_ENTITY_TYPE,
    entity_id: applicationActivityEntityId(payment.application_id),
    action: "payment_completed",
    message,
    created_by_type: "student",
    admin_id: null,
    school_admin_id: null,
    student_id: studentId,
  });

  if (logErr) {
    console.error("[markApplicationPaymentPaid] activity log", logErr);
  }

  return { ok: true };
}
