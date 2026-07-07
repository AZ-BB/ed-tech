import "server-only";

import {
  POST_ADMISSION_ACTIVITY_ENTITY_TYPE,
  postAdmissionActivityEntityId,
} from "@/lib/post-admission-activity-log";
import { applyPostAdmissionPaymentCompletionEffects } from "@/lib/post-admission-payment-completion";
import { applyApplicationPaymentCompletionEffects } from "@/lib/application-payment-completion";
import { createAdvisorPayoutForPayment } from "@/lib/advisor-payouts/create-advisor-payout-for-payment";
import {
  APPLICATION_ACTIVITY_ENTITY_TYPE,
  applicationActivityEntityId,
} from "@/lib/application-activity-log";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export async function markPaymentPaid(
  paymentId: number,
  options?: { message?: string; studentId?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = await createSupabaseSecretClient();
  const now = new Date().toISOString();

  const { data: payment, error: fetchErr } = await secret
    .from("payments")
    .select("id, application_id, post_admission_case_id, student_id, status")
    .eq("id", paymentId)
    .maybeSingle();

  if (fetchErr || !payment) {
    console.error("[markPaymentPaid] fetch", fetchErr);
    return { ok: false, error: "Payment not found." };
  }

  const isPostAdmission = payment.post_admission_case_id != null;

  if (payment.status === "paid") {
    if (isPostAdmission && payment.post_admission_case_id) {
      await applyPostAdmissionPaymentCompletionEffects(
        secret,
        payment.post_admission_case_id,
        now,
        { isFirstPayment: false },
      );
    } else if (payment.application_id) {
      await applyApplicationPaymentCompletionEffects(
        secret,
        payment.application_id,
        now,
        { isFirstPayment: false },
      );
    }
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
    console.error("[markPaymentPaid] update", updateErr);
    return { ok: false, error: "Could not update payment status." };
  }

  if (!updated) {
    const { data: current } = await secret
      .from("payments")
      .select("status")
      .eq("id", paymentId)
      .maybeSingle();

    if (current?.status === "paid") {
      return markPaymentPaid(paymentId, options);
    }

    return { ok: false, error: "Payment is not pending." };
  }

  const studentId = options?.studentId ?? payment.student_id;

  if (isPostAdmission && payment.post_admission_case_id) {
    const caseId = payment.post_admission_case_id;
    const { count: paidCount, error: paidCountErr } = await secret
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("post_admission_case_id", caseId)
      .eq("status", "paid");

    if (paidCountErr) {
      console.error("[markPaymentPaid] paid count", paidCountErr);
    }

    const isFirstPayment = (paidCount ?? 0) <= 1;
    const message =
      options?.message ??
      `Post-admission support payment received for case #${caseId}.`;

    const { error: logErr } = await secret.from("acitivity_logs").insert({
      entitiy_type: POST_ADMISSION_ACTIVITY_ENTITY_TYPE,
      entity_id: postAdmissionActivityEntityId(caseId),
      action: "payment_completed",
      message,
      created_by_type: "student",
      admin_id: null,
      school_admin_id: null,
      student_id: studentId,
    });

    if (logErr) {
      console.error("[markPaymentPaid] activity log", logErr);
    }

    await applyPostAdmissionPaymentCompletionEffects(secret, caseId, now, {
      isFirstPayment,
    });
  } else if (payment.application_id) {
    const applicationId = payment.application_id;
    const { count: paidCount, error: paidCountErr } = await secret
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("application_id", applicationId)
      .eq("status", "paid");

    if (paidCountErr) {
      console.error("[markPaymentPaid] paid count", paidCountErr);
    }

    const isFirstPayment = (paidCount ?? 0) <= 1;
    const message =
      options?.message ??
      `Application support deposit paid for application #${applicationId}.`;

    const { error: logErr } = await secret.from("acitivity_logs").insert({
      entitiy_type: APPLICATION_ACTIVITY_ENTITY_TYPE,
      entity_id: applicationActivityEntityId(applicationId),
      action: "payment_completed",
      message,
      created_by_type: "student",
      admin_id: null,
      school_admin_id: null,
      student_id: studentId,
    });

    if (logErr) {
      console.error("[markPaymentPaid] activity log", logErr);
    }

    await applyApplicationPaymentCompletionEffects(secret, applicationId, now, {
      isFirstPayment,
    });
  }

  await createAdvisorPayoutForPayment(paymentId);

  return { ok: true };
}

/** @deprecated Use markPaymentPaid */
export async function markApplicationPaymentPaid(
  paymentId: number,
  options?: { message?: string; studentId?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  return markPaymentPaid(paymentId, options);
}
