import "server-only";

import {
  APPLICATION_ACTIVITY_ENTITY_TYPE,
  applicationActivityEntityId,
} from "@/lib/application-activity-log";
import { applyFirstPaymentRequestStatusEffects } from "@/lib/application-support-status-transitions";
import {
  updateApplicationPackageDataCore,
  updateApplicationPackageUniversitiesTotalCore,
} from "@/lib/application-package-actions-core";
import { parseApplicationPackageData } from "@/lib/application-package-data";
import { isResendConfigured } from "@/lib/resend/config";
import {
  sendApplicationPaymentRequestEmail,
  resolvePaymentFromEmailDisplay,
} from "@/lib/resend/application-payment-request-email";
import { buildApplicationPaymentUrl } from "@/lib/resend/site-url";
import {
  replacePaymentLinkPlaceholder,
  validatePaymentRequestEmailBody,
  type SendPaymentRequestInput,
} from "@/lib/payment-request-email-content";
import {
  expireOverduePendingPayments,
  formatPlanDisplayName,
  hasActivePendingPaymentRequest,
  isCustomApplicationPlan,
  parseDueDateInput,
  validateDueDateNotPast,
} from "@/lib/payment-request-utils";
import { isStripeConfigured } from "@/lib/stripe/config";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { randomUUID } from "node:crypto";

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type PaymentRequestActionResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

type PlanRow = {
  id: number;
  name: string;
  price: number;
  universities_count: number;
  is_active: boolean;
};

function firstEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

function parseApplicationId(raw: number): number | null {
  if (!Number.isFinite(raw) || raw < 1) return null;
  return Math.trunc(raw);
}

function parseAmountAed(raw: number): number | null {
  if (!Number.isFinite(raw) || raw <= 0) return null;
  return Math.round(raw * 100) / 100;
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

async function insertInternalNote(
  secret: SecretClient,
  applicationId: number,
  studentId: string,
  authorUserId: string,
  authorRole: "advisor" | "admin",
  authorName: string,
  content: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = content.trim();
  if (!trimmed) return { ok: true };
  if (trimmed.length > 8000) {
    return { ok: false, error: "Note is too long (max 8,000 characters)." };
  }

  const now = new Date().toISOString();
  const { error: insertErr } = await secret.from("application_internal_notes").insert({
    application_id: applicationId,
    student_id: studentId,
    author_user_id: authorUserId,
    author_role: authorRole,
    author_name: authorName,
    content: trimmed,
    visibility: "internal",
    created_at: now,
  });

  if (insertErr) {
    console.error("[sendApplicationPaymentRequestCore] internal note", insertErr);
    return { ok: false, error: "Could not save internal note." };
  }

  await secret
    .from("applications")
    .update({ updated_at: now })
    .eq("id", applicationId);

  return { ok: true };
}

async function updateApplicationPlanOnSend(
  secret: SecretClient,
  applicationId: number,
  plan: PlanRow,
  customUniversitiesCount: number | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = new Date().toISOString();

  const { error: planErr } = await secret
    .from("applications")
    .update({ plan_id: plan.id, updated_at: now })
    .eq("id", applicationId);

  if (planErr) {
    console.error("[sendApplicationPaymentRequestCore] plan update", planErr);
    return { ok: false, error: "Could not update application package." };
  }

  if (isCustomApplicationPlan(plan)) {
    if (customUniversitiesCount == null || customUniversitiesCount < 1) {
      return { ok: false, error: "Enter the number of universities for the custom package." };
    }
    const uniResult = await updateApplicationPackageUniversitiesTotalCore(
      secret,
      applicationId,
      customUniversitiesCount,
    );
    if (!uniResult.ok) return uniResult;
    return { ok: true };
  }

  const { data: appRow, error: fetchErr } = await secret
    .from("applications")
    .select("package_data")
    .eq("id", applicationId)
    .maybeSingle();

  if (fetchErr || !appRow) {
    console.error("[sendApplicationPaymentRequestCore] package fetch", fetchErr);
    return { ok: false, error: "Could not load application package data." };
  }

  const packageData = parseApplicationPackageData(appRow.package_data);
  if (packageData.universitiesTotal != null) {
    const clearResult = await updateApplicationPackageDataCore(secret, applicationId, {
      universitiesTotal: null,
    });
    if (!clearResult.ok) return clearResult;
  }

  return { ok: true };
}

export type SendApplicationPaymentRequestCoreOptions = {
  applicationId: number;
  input: SendPaymentRequestInput;
  actorName: string;
  actorUserId: string;
  actorRole: "advisor" | "admin";
  requestedByType: "advisor" | "admin";
  requestedByAdvisorId: string | null;
  assertApplicationAccess: (
    secret: SecretClient,
    applicationId: number,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  logActivity: (
    secret: SecretClient,
    params: {
      applicationId: number;
      studentId: string;
      message: string;
    },
  ) => Promise<void>;
};

export async function sendApplicationPaymentRequestCore(
  options: SendApplicationPaymentRequestCoreOptions,
): Promise<PaymentRequestActionResult> {
  const applicationId = parseApplicationId(options.applicationId);
  if (applicationId == null) {
    return { ok: false, error: "Invalid application." };
  }

  const { input } = options;
  const amountAed = parseAmountAed(input.amountAed);
  if (amountAed == null) {
    return { ok: false, error: "Enter a valid payment amount." };
  }

  const dueDate = parseDueDateInput(input.dueDate);
  if (!dueDate) {
    return { ok: false, error: "Enter a valid due date." };
  }
  if (!validateDueDateNotPast(dueDate)) {
    return { ok: false, error: "Due date cannot be in the past." };
  }

  if (!Number.isFinite(input.planId) || input.planId < 1) {
    return { ok: false, error: "Select a package." };
  }

  const emailBodyError = validatePaymentRequestEmailBody(input.emailBody ?? "");
  if (emailBodyError) {
    return { ok: false, error: emailBodyError };
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

  const access = await options.assertApplicationAccess(secret, applicationId);
  if (!access.ok) return access;

  const { data: plan, error: planErr } = await secret
    .from("applications_plans")
    .select("id, name, price, universities_count, is_active")
    .eq("id", input.planId)
    .maybeSingle();

  if (planErr || !plan) {
    console.error("[sendApplicationPaymentRequestCore] plan", planErr);
    return { ok: false, error: "Selected package not found." };
  }

  if (!plan.is_active) {
    return { ok: false, error: "Selected package is not available." };
  }

  const planRow = plan as PlanRow;
  const isCustom = isCustomApplicationPlan(planRow);

  if (isCustom) {
    const customCount = input.customUniversitiesCount;
    if (customCount == null || !Number.isFinite(customCount) || customCount < 1) {
      return {
        ok: false,
        error: "Enter the number of universities for the custom package.",
      };
    }
  }

  const { data: application, error: appErr } = await secret
    .from("applications")
    .select(
      `
      id,
      student_id,
      student_name,
      student_email,
      student_profiles ( first_name, last_name, email )
    `,
    )
    .eq("id", applicationId)
    .maybeSingle();

  if (appErr || !application) {
    console.error("[sendApplicationPaymentRequestCore] application", appErr);
    return { ok: false, error: "Application not found." };
  }

  const profile = firstEmbed(application.student_profiles);
  const studentEmail = resolveStudentEmail(application, profile);
  if (!studentEmail) {
    return {
      ok: false,
      error: "This application has no student email on file.",
    };
  }

  await expireOverduePendingPayments(secret, { applicationId });

  const { data: existingPayments, error: payErr } = await secret
    .from("payments")
    .select("id, status, amount, payment_request_sent_at, payment_request_token, due_date")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });

  if (payErr) {
    console.error("[sendApplicationPaymentRequestCore] payments", payErr);
    return { ok: false, error: "Could not load payment records." };
  }

  if (hasActivePendingPaymentRequest(existingPayments ?? [])) {
    return {
      ok: false,
      error: "This application already has a pending payment request.",
    };
  }

  const planUpdateResult = await updateApplicationPlanOnSend(
    secret,
    applicationId,
    planRow,
    isCustom ? Math.floor(input.customUniversitiesCount ?? 0) : null,
  );
  if (!planUpdateResult.ok) return planUpdateResult;

  const hadPriorPaymentRequest = (existingPayments ?? []).some(
    (row) => row.payment_request_sent_at != null,
  );

  const reusablePayment = (existingPayments ?? []).find(
    (row) => row.status === "pending" || row.status === "failed",
  );

  const token = randomUUID();
  const now = new Date().toISOString();
  const customUniversitiesCount = isCustom
    ? Math.floor(input.customUniversitiesCount ?? 0)
    : null;

  const paymentPayload = {
    status: "pending" as const,
    payment_request_token: token,
    payment_request_sent_at: now,
    amount: amountAed,
    due_date: dueDate,
    requested_plan_id: planRow.id,
    custom_universities_count: customUniversitiesCount,
    paid_at: null,
    stripe_checkout_session_id: null,
    requested_by_type: options.requestedByType,
    requested_by_advisor_id: options.requestedByAdvisorId,
    updated_at: now,
  };

  if (reusablePayment) {
    const { error: updateErr } = await secret
      .from("payments")
      .update(paymentPayload)
      .eq("id", reusablePayment.id);

    if (updateErr) {
      console.error("[sendApplicationPaymentRequestCore] token update", updateErr);
      return { ok: false, error: "Could not prepare payment request." };
    }
  } else {
    const { error: insertErr } = await secret.from("payments").insert({
      student_id: application.student_id,
      application_id: applicationId,
      ...paymentPayload,
    });

    if (insertErr) {
      console.error("[sendApplicationPaymentRequestCore] insert", insertErr);
      return { ok: false, error: "Could not create payment request." };
    }
  }

  if (input.internalNote?.trim()) {
    const noteResult = await insertInternalNote(
      secret,
      applicationId,
      application.student_id,
      options.actorUserId,
      options.actorRole,
      options.actorName,
      input.internalNote,
    );
    if (!noteResult.ok) return noteResult;
  }

  const payUrl = await buildApplicationPaymentUrl(token);
  const studentFirstName = resolveStudentFirstName(application, profile);
  const packageDisplayName = formatPlanDisplayName(planRow, customUniversitiesCount);
  const fromEmailDisplay = resolvePaymentFromEmailDisplay();

  const resolvedEmailBody = replacePaymentLinkPlaceholder(
    input.emailBody.trim(),
    payUrl,
  );

  const emailResult = await sendApplicationPaymentRequestEmail({
    recipientEmail: studentEmail,
    studentFirstName,
    packageDisplayName,
    payUrl,
    amountAed,
    senderName: options.actorName,
    fromEmailDisplay,
    bodyOverride: resolvedEmailBody,
  });

  if ("error" in emailResult) {
    return { ok: false, error: emailResult.error };
  }

  const dueLabel = new Date(`${dueDate}T12:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  let activityMessage = `${options.actorName} sent a ${amountAed.toLocaleString()} AED payment request to ${studentEmail} for application #${applicationId} (due ${dueLabel}).`;
  if (customUniversitiesCount != null) {
    activityMessage += ` Custom package: ${customUniversitiesCount} universities.`;
  }

  await options.logActivity(secret, {
    applicationId,
    studentId: application.student_id,
    message: activityMessage,
  });

  if (!hadPriorPaymentRequest) {
    await applyFirstPaymentRequestStatusEffects(secret, applicationId, now);
  }

  return { ok: true, email: studentEmail };
}
