import "server-only";

import {
  APPLICATION_ACTIVITY_ENTITY_TYPE,
  applicationActivityEntityId,
} from "@/lib/application-activity-log";
import { createAdvisorPayoutForPayment } from "@/lib/advisor-payouts/create-advisor-payout-for-payment";
import {
  activateApplicationPackageOffline,
  type ActivateApplicationPackageInput,
} from "@/lib/activate-application-package-offline";
import {
  parseApplicationPackageData,
  resolveApplicationUniversitiesTotal,
} from "@/lib/application-package-data";
import { applyApplicationPaymentCompletionEffects } from "@/lib/application-payment-completion";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type RecordManualApplicationPaymentInput = {
  applicationId: number;
  amountAed: number;
  /** Required when activating a lead that is not yet an active package. */
  universitiesCount?: number;
};

export type RecordManualApplicationPaymentResult =
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

/**
 * Record a paid offline/manual payment for an assigned application.
 * - Leads / payment_requested: activates the package (same as Activate package).
 * - Active packages: records an additional paid payment + advisor payout.
 */
export async function recordManualApplicationPayment(options: {
  input: RecordManualApplicationPaymentInput;
  advisorId: string;
  advisorName: string;
}): Promise<RecordManualApplicationPaymentResult> {
  const applicationId = parseApplicationId(options.input.applicationId);
  if (applicationId == null) {
    return { ok: false, error: "Invalid application." };
  }

  const amountAed = parseAmountAed(options.input.amountAed);
  if (amountAed == null) {
    return { ok: false, error: "Enter a valid paid amount." };
  }

  const secret = await createSupabaseSecretClient();

  const { data: application, error: appErr } = await secret
    .from("applications")
    .select(
      "id, student_id, status, assigned_to, package_data, applications_plans!applications_plan_id_fkey ( universities_count )",
    )
    .eq("id", applicationId)
    .maybeSingle();

  if (appErr || !application) {
    console.error("[recordManualApplicationPayment] application", appErr);
    return { ok: false, error: "Application not found." };
  }

  if (application.assigned_to !== options.advisorId) {
    return { ok: false, error: "You do not have access to this application." };
  }

  if (application.status === "not_suitable") {
    return { ok: false, error: "Not suitable leads cannot receive payments." };
  }

  const status = application.status?.trim() || "lead";

  if (status !== "active_package") {
    const planEmbed = application.applications_plans;
    const plan = Array.isArray(planEmbed) ? planEmbed[0] : planEmbed;
    const packageData = parseApplicationPackageData(application.package_data);
    const fallbackUnis = resolveApplicationUniversitiesTotal(
      packageData,
      plan?.universities_count ?? 1,
    );
    const universitiesCount =
      options.input.universitiesCount != null &&
      Number.isFinite(options.input.universitiesCount) &&
      options.input.universitiesCount >= 1
        ? Math.floor(options.input.universitiesCount)
        : fallbackUnis;

    const activateInput: ActivateApplicationPackageInput = {
      applicationId,
      amountAed,
      universitiesCount: Math.max(1, universitiesCount),
    };

    return activateApplicationPackageOffline({
      input: activateInput,
      advisorId: options.advisorId,
      advisorName: options.advisorName,
    });
  }

  const now = new Date().toISOString();

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
      custom_universities_count: null,
      requested_by_type: "advisor",
      requested_by_advisor_id: options.advisorId,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (insertErr || !paidRow) {
    console.error("[recordManualApplicationPayment] insert", insertErr);
    return { ok: false, error: "Could not record the payment." };
  }

  await applyApplicationPaymentCompletionEffects(secret, applicationId, now, {
    isFirstPayment: false,
  });

  await createAdvisorPayoutForPayment(paidRow.id);

  const { error: logErr } = await secret.from("acitivity_logs").insert({
    entitiy_type: APPLICATION_ACTIVITY_ENTITY_TYPE,
    entity_id: applicationActivityEntityId(applicationId),
    action: "application_manual_payment_recorded",
    message: `${options.advisorName} recorded a manual payment of ${amountAed} AED on application #${applicationId}.`,
    created_by_type: "admin",
    admin_id: null,
    school_admin_id: null,
    student_id: application.student_id,
  });

  if (logErr) {
    console.error("[recordManualApplicationPayment] activity log", logErr);
  }

  return { ok: true, paymentId: paidRow.id };
}
