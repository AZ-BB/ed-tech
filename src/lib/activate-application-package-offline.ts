import "server-only";

import {
  APPLICATION_ACTIVITY_ENTITY_TYPE,
  applicationActivityEntityId,
} from "@/lib/application-activity-log";
import { createAdvisorPayoutForPayment } from "@/lib/advisor-payouts/create-advisor-payout-for-payment";
import { applyApplicationPaymentCompletionEffects } from "@/lib/application-payment-completion";
import { updateApplicationPackageUniversitiesTotalCore } from "@/lib/application-package-actions-core";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type ActivateApplicationPackageInput = {
  applicationId: number;
  amountAed: number;
  universitiesCount: number;
};

export type ActivateApplicationPackageResult =
  | { ok: true; paymentId: number }
  | { ok: false; error: string };

function parseApplicationId(raw: number): number | null {
  if (!Number.isFinite(raw) || raw < 1) return null;
  return Math.trunc(raw);
}

function parseAmountAed(raw: number): number | null {
  if (!Number.isFinite(raw) || raw <= 0) return null;
  return Math.round(raw * 100) / 100;
}

function parseUniversitiesCount(raw: number): number | null {
  if (!Number.isFinite(raw) || raw < 1) return null;
  return Math.floor(raw);
}

/**
 * Record an offline (non-Stripe) paid payment and promote the application to
 * active_package so it appears under Paying Customers.
 */
export async function activateApplicationPackageOffline(options: {
  input: ActivateApplicationPackageInput;
  advisorId: string;
  advisorName: string;
}): Promise<ActivateApplicationPackageResult> {
  const applicationId = parseApplicationId(options.input.applicationId);
  if (applicationId == null) {
    return { ok: false, error: "Invalid application." };
  }

  const amountAed = parseAmountAed(options.input.amountAed);
  if (amountAed == null) {
    return { ok: false, error: "Enter a valid paid amount." };
  }

  const universitiesCount = parseUniversitiesCount(options.input.universitiesCount);
  if (universitiesCount == null) {
    return { ok: false, error: "Enter the number of universities." };
  }

  const secret = await createSupabaseSecretClient();

  const { data: application, error: appErr } = await secret
    .from("applications")
    .select("id, student_id, status, assigned_to")
    .eq("id", applicationId)
    .maybeSingle();

  if (appErr || !application) {
    console.error("[activateApplicationPackageOffline] application", appErr);
    return { ok: false, error: "Application not found." };
  }

  if (application.assigned_to !== options.advisorId) {
    return { ok: false, error: "You do not have access to this application." };
  }

  if (application.status === "not_suitable") {
    return { ok: false, error: "Not suitable leads cannot be activated." };
  }

  if (application.status === "active_package") {
    return { ok: false, error: "This lead is already an active package." };
  }

  const now = new Date().toISOString();

  const uniResult = await updateApplicationPackageUniversitiesTotalCore(
    secret,
    applicationId,
    universitiesCount,
  );
  if (!uniResult.ok) return uniResult;

  // Cancel any open Stripe payment requests so Activate owns the payment state.
  const { error: cancelErr } = await secret
    .from("payments")
    .update({ status: "failed", updated_at: now })
    .eq("application_id", applicationId)
    .eq("status", "pending");

  if (cancelErr) {
    console.error("[activateApplicationPackageOffline] cancel pending", cancelErr);
  }

  const { data: paidRow, error: insertErr } = await secret
    .from("payments")
    .insert({
      application_id: applicationId,
      post_admission_case_id: null,
      student_id: application.student_id,
      amount: amountAed,
      status: "paid",
      paid_at: now,
      due_date: null,
      payment_request_token: null,
      payment_request_sent_at: null,
      stripe_checkout_session_id: null,
      requested_plan_id: null,
      custom_universities_count: universitiesCount,
      requested_by_type: "advisor",
      requested_by_advisor_id: options.advisorId,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (insertErr || !paidRow) {
    console.error("[activateApplicationPackageOffline] insert payment", insertErr);
    return { ok: false, error: "Could not record the payment." };
  }

  await applyApplicationPaymentCompletionEffects(secret, applicationId, now, {
    isFirstPayment: true,
  });

  await createAdvisorPayoutForPayment(paidRow.id);

  const { error: logErr } = await secret.from("acitivity_logs").insert({
    entitiy_type: APPLICATION_ACTIVITY_ENTITY_TYPE,
    entity_id: applicationActivityEntityId(applicationId),
    action: "application_package_activated_offline",
    message: `${options.advisorName} activated application #${applicationId} with an offline payment of ${amountAed} AED (${universitiesCount} universities).`,
    created_by_type: "admin",
    admin_id: null,
    school_admin_id: null,
    student_id: application.student_id,
  });

  if (logErr) {
    console.error("[activateApplicationPackageOffline] activity log", logErr);
  }

  return { ok: true, paymentId: paidRow.id };
}
