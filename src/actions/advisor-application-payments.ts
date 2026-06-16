"use server";

import {
  APPLICATION_ACTIVITY_ENTITY_TYPE,
  applicationActivityEntityId,
} from "@/lib/application-activity-log";
import {
  assertAdvisorAccess,
  assertAdvisorAssignedApplication,
} from "@/lib/advisor-access";
import { isResendConfigured } from "@/lib/resend/config";
import { sendApplicationPaymentRequestEmail } from "@/lib/resend/application-payment-request-email";
import { buildApplicationPaymentUrl } from "@/lib/resend/site-url";
import { isStripeConfigured } from "@/lib/stripe/config";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

type AdvisorPaymentActionResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

function parseApplicationId(raw: number): number | null {
  if (!Number.isFinite(raw) || raw < 1) return null;
  return Math.trunc(raw);
}

function parseAmountAed(raw: number): number | null {
  if (!Number.isFinite(raw) || raw <= 0) return null;
  return Math.round(raw * 100) / 100;
}

function firstEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

function resolvePackageLabel(
  plan:
    | { name: string; universities_count: number }
    | { name: string; universities_count: number }[]
    | null,
): string {
  const row = firstEmbed(plan);
  if (!row) return "Application support";
  const count = row.universities_count;
  if (Number.isFinite(count) && count > 0) {
    return `${count} ${count === 1 ? "university" : "universities"}`;
  }
  return row.name?.trim() || "Application support";
}

function resolvePlanPrice(
  plan: { price: number } | { price: number }[] | null,
): number {
  const row = firstEmbed(plan);
  if (!row || !Number.isFinite(row.price) || row.price <= 0) return 0;
  return row.price;
}

function resolveStudentFirstName(
  application: { student_name: string | null },
  profile: { first_name: string; last_name: string } | null,
): string {
  const fromProfile = profile?.first_name?.trim();
  if (fromProfile) return fromProfile;
  const fromApplication = application.student_name?.trim().split(/\s+/)[0];
  if (fromApplication) return fromApplication;
  return "there";
}

function resolveStudentEmail(
  application: { student_email: string | null },
  profile: { email: string | null } | null,
): string {
  const fromProfile = profile?.email?.trim();
  if (fromProfile) return fromProfile;
  return application.student_email?.trim() || "";
}

function revalidateApplicationPaths(applicationId: number) {
  revalidatePath("/advisor/applications");
  revalidatePath(`/advisor/applications/${applicationId}`);
}

export async function sendAdvisorApplicationPaymentRequest(
  applicationIdRaw: number,
  amountAedRaw: number,
): Promise<AdvisorPaymentActionResult> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;

  const applicationId = parseApplicationId(applicationIdRaw);
  if (applicationId == null) {
    return { ok: false, error: "Invalid application." };
  }

  const assignment = await assertAdvisorAssignedApplication(
    access.advisorId,
    applicationId,
  );
  if (!assignment.ok) return assignment;

  const amountAed = parseAmountAed(amountAedRaw);
  if (amountAed == null) {
    return { ok: false, error: "Enter a valid payment amount." };
  }

  if (!isStripeConfigured()) {
    return {
      ok: false,
      error: "Stripe is not configured. Set STRIPE_SECRET_KEY.",
    };
  }

  if (!isResendConfigured()) {
    return {
      ok: false,
      error: "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
    };
  }

  const secret = await createSupabaseSecretClient();

  const { data: application, error: appErr } = await secret
    .from("applications")
    .select(
      `
      id,
      student_id,
      student_name,
      student_email,
      applications_plans ( name, universities_count, price ),
      student_profiles ( first_name, last_name, email )
    `,
    )
    .eq("id", applicationId)
    .eq("assigned_to", access.advisorId)
    .maybeSingle();

  if (appErr || !application) {
    console.error("[sendAdvisorApplicationPaymentRequest] application", appErr);
    return { ok: false, error: "Application not found." };
  }

  const planPrice = resolvePlanPrice(application.applications_plans);
  if (planPrice <= 0) {
    return { ok: false, error: "This application has no package price configured." };
  }

  const profile = firstEmbed(application.student_profiles);
  const studentEmail = resolveStudentEmail(application, profile);
  if (!studentEmail) {
    return {
      ok: false,
      error: "This application has no student email on file.",
    };
  }

  const { data: existingPayments, error: payErr } = await secret
    .from("payments")
    .select("id, status, amount")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });

  if (payErr) {
    console.error("[sendAdvisorApplicationPaymentRequest] payment", payErr);
    return { ok: false, error: "Could not load payment records." };
  }

  const reusablePayment = (existingPayments ?? []).find(
    (row) => row.status === "pending" || row.status === "failed",
  );

  const token = randomUUID();
  const now = new Date().toISOString();

  if (reusablePayment) {
    const { error: updateErr } = await secret
      .from("payments")
      .update({
        status: "pending",
        payment_request_token: token,
        payment_request_sent_at: now,
        amount: amountAed,
        paid_at: null,
        stripe_checkout_session_id: null,
        requested_by_type: "advisor",
        requested_by_advisor_id: access.advisorId,
        updated_at: now,
      })
      .eq("id", reusablePayment.id);

    if (updateErr) {
      console.error("[sendAdvisorApplicationPaymentRequest] token update", updateErr);
      return { ok: false, error: "Could not prepare payment request." };
    }
  } else {
    const { error: insertErr } = await secret.from("payments").insert({
      student_id: application.student_id,
      application_id: applicationId,
      amount: amountAed,
      status: "pending",
      payment_request_token: token,
      payment_request_sent_at: now,
      requested_by_type: "advisor",
      requested_by_advisor_id: access.advisorId,
    });

    if (insertErr) {
      console.error("[sendAdvisorApplicationPaymentRequest] insert", insertErr);
      return { ok: false, error: "Could not create payment request." };
    }
  }

  const payUrl = await buildApplicationPaymentUrl(token);
  const studentFirstName = resolveStudentFirstName(application, profile);
  const packageLabel = resolvePackageLabel(application.applications_plans);

  const emailResult = await sendApplicationPaymentRequestEmail({
    to: studentEmail,
    studentFirstName,
    applicationId,
    packageLabel,
    payUrl,
    amountAed,
  });

  if ("error" in emailResult) {
    return { ok: false, error: emailResult.error };
  }

  const { error: logErr } = await secret.from("acitivity_logs").insert({
    entitiy_type: APPLICATION_ACTIVITY_ENTITY_TYPE,
    entity_id: applicationActivityEntityId(applicationId),
    action: "payment_request_sent",
    message: `${access.advisorName} sent a ${amountAed.toLocaleString()} AED payment request to ${studentEmail} for application #${applicationId}.`,
    created_by_type: "admin",
    admin_id: null,
    school_admin_id: null,
    student_id: application.student_id,
  });

  if (logErr) {
    console.error("[sendAdvisorApplicationPaymentRequest] activity log", logErr);
  }

  revalidateApplicationPaths(applicationId);

  return { ok: true, email: studentEmail };
}
