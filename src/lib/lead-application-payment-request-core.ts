import "server-only";

import { updateApplicationPackageUniversitiesTotalCore } from "@/lib/application-package-actions-core";
import { isResendConfigured } from "@/lib/resend/config";
import {
  sendApplicationPaymentRequestEmail,
  resolvePaymentFromEmailDisplay,
} from "@/lib/resend/application-payment-request-email";
import { buildApplicationPaymentUrl } from "@/lib/resend/site-url";
import {
  replacePaymentLinkPlaceholder,
  validatePaymentRequestEmailBody,
} from "@/lib/payment-request-email-content";
import {
  defaultPaymentDueDateString,
  expireOverduePendingPayments,
  validateDueDateNotPast,
} from "@/lib/payment-request-utils";
import type {
  LeadApplicationPaymentEmailInput,
  LeadApplicationPaymentLinkInput,
} from "@/lib/lead-application-payment-types";
import { isStripeConfigured } from "@/lib/stripe/config";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { randomUUID } from "node:crypto";

export type {
  LeadApplicationPaymentEmailInput,
  LeadApplicationPaymentLinkInput,
} from "@/lib/lead-application-payment-types";

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type LeadPaymentLinkResult =
  | { ok: true; payUrl: string }
  | { ok: false; error: string };

export type LeadPaymentEmailResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

type PreparedLeadPayment = {
  secret: SecretClient;
  applicationId: number;
  studentId: string;
  token: string;
  amountAed: number;
  dueDate: string;
  universitiesCount: number;
  now: string;
  defaultStudentFirstName: string;
  defaultStudentEmail: string;
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

function parseUniversitiesCount(raw: number): number | null {
  if (!Number.isFinite(raw) || raw < 1) return null;
  return Math.floor(raw);
}

function parseRecipientEmail(raw: string): string | null {
  const email = raw.trim();
  if (!email || email.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
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

function firstNameFromDisplayName(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first || "there";
}

function formatUniversitiesPackageName(universitiesCount: number): string {
  return `${universitiesCount}-University Application Package`;
}

async function prepareLeadApplicationPayment(options: {
  applicationId: number;
  amountAed: number;
  universitiesCount: number;
  requestedByType: "advisor" | "admin";
  requestedByAdvisorId: string | null;
  assertApplicationAccess: (
    secret: SecretClient,
    applicationId: number,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  requireStudentEmail: boolean;
}): Promise<{ ok: true; prepared: PreparedLeadPayment } | { ok: false; error: string }> {
  const applicationId = parseApplicationId(options.applicationId);
  if (applicationId == null) {
    return { ok: false, error: "Invalid application." };
  }

  const amountAed = parseAmountAed(options.amountAed);
  if (amountAed == null) {
    return { ok: false, error: "Enter a valid payment amount." };
  }

  const universitiesCount = parseUniversitiesCount(options.universitiesCount);
  if (universitiesCount == null) {
    return { ok: false, error: "Enter the number of universities." };
  }

  const dueDate = defaultPaymentDueDateString();
  if (!validateDueDateNotPast(dueDate)) {
    return { ok: false, error: "Due date cannot be in the past." };
  }

  if (!isStripeConfigured()) {
    return {
      ok: false,
      error: "Stripe is not configured. Set STRIPE_SECRET_KEY.",
    };
  }

  const secret = await createSupabaseSecretClient();

  const access = await options.assertApplicationAccess(secret, applicationId);
  if (!access.ok) return access;

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
    console.error("[lead-application-payment] application", appErr);
    return { ok: false, error: "Application not found." };
  }

  const profile = firstEmbed(application.student_profiles);
  const defaultStudentEmail = resolveStudentEmail(application, profile);
  if (options.requireStudentEmail && !defaultStudentEmail) {
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
    console.error("[lead-application-payment] payments", payErr);
    return { ok: false, error: "Could not load payment records." };
  }

  const now = new Date().toISOString();

  const uniResult = await updateApplicationPackageUniversitiesTotalCore(
    secret,
    applicationId,
    universitiesCount,
  );
  if (!uniResult.ok) return uniResult;

  await secret
    .from("applications")
    .update({ updated_at: now })
    .eq("id", applicationId);

  const reusablePayment = (existingPayments ?? []).find(
    (row) => row.status === "pending" || row.status === "failed",
  );

  const token = randomUUID();
  const paymentPayload = {
    status: "pending" as const,
    payment_request_token: token,
    payment_request_sent_at: now,
    amount: amountAed,
    due_date: dueDate,
    requested_plan_id: null,
    custom_universities_count: universitiesCount,
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
      console.error("[lead-application-payment] token update", updateErr);
      return { ok: false, error: "Could not prepare payment request." };
    }
  } else {
    const { error: insertErr } = await secret.from("payments").insert({
      student_id: application.student_id,
      application_id: applicationId,
      ...paymentPayload,
    });

    if (insertErr) {
      console.error("[lead-application-payment] insert", insertErr);
      return { ok: false, error: "Could not create payment request." };
    }
  }

  return {
    ok: true,
    prepared: {
      secret,
      applicationId,
      studentId: application.student_id,
      token,
      amountAed,
      dueDate,
      universitiesCount,
      now,
      defaultStudentFirstName: resolveStudentFirstName(application, profile),
      defaultStudentEmail,
    },
  };
}

/**
 * Create a pending Stripe-backed payment request and return the shareable pay URL
 * without sending an email.
 */
export async function createApplicationPaymentLinkCore(options: {
  input: LeadApplicationPaymentLinkInput;
  actorName: string;
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
}): Promise<LeadPaymentLinkResult> {
  const preparedResult = await prepareLeadApplicationPayment({
    applicationId: options.input.applicationId,
    amountAed: options.input.amountAed,
    universitiesCount: options.input.universitiesCount,
    requestedByType: options.requestedByType,
    requestedByAdvisorId: options.requestedByAdvisorId,
    assertApplicationAccess: options.assertApplicationAccess,
    requireStudentEmail: false,
  });

  if (!preparedResult.ok) return preparedResult;
  const { prepared } = preparedResult;

  const payUrl = await buildApplicationPaymentUrl(prepared.token);

  const dueLabel = new Date(`${prepared.dueDate}T12:00:00`).toLocaleDateString(
    undefined,
    { day: "numeric", month: "short", year: "numeric" },
  );

  await options.logActivity(prepared.secret, {
    applicationId: prepared.applicationId,
    studentId: prepared.studentId,
    message: `${options.actorName} generated a ${prepared.amountAed.toLocaleString()} AED payment link for application #${prepared.applicationId} (${prepared.universitiesCount} universities, due ${dueLabel}).`,
  });

  // Keep status as `lead` until payment completes or Activate is used.
  return { ok: true, payUrl };
}

/**
 * Create a pending payment and email the pay URL to an editable recipient.
 */
export async function sendLeadApplicationPaymentRequestCore(options: {
  input: LeadApplicationPaymentEmailInput;
  actorName: string;
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
}): Promise<LeadPaymentEmailResult> {
  if (!isResendConfigured()) {
    return {
      ok: false,
      error: "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
    };
  }

  const recipientEmail = parseRecipientEmail(options.input.recipientEmail);
  if (!recipientEmail) {
    return { ok: false, error: "Enter a valid recipient email." };
  }

  const recipientName = options.input.recipientName.trim();
  if (!recipientName) {
    return { ok: false, error: "Enter a recipient name." };
  }

  const emailBodyError = validatePaymentRequestEmailBody(options.input.emailBody ?? "");
  if (emailBodyError) {
    return { ok: false, error: emailBodyError };
  }

  const preparedResult = await prepareLeadApplicationPayment({
    applicationId: options.input.applicationId,
    amountAed: options.input.amountAed,
    universitiesCount: options.input.universitiesCount,
    requestedByType: options.requestedByType,
    requestedByAdvisorId: options.requestedByAdvisorId,
    assertApplicationAccess: options.assertApplicationAccess,
    requireStudentEmail: false,
  });

  if (!preparedResult.ok) return preparedResult;
  const { prepared } = preparedResult;

  const payUrl = await buildApplicationPaymentUrl(prepared.token);
  const studentFirstName = firstNameFromDisplayName(recipientName);
  const packageDisplayName = formatUniversitiesPackageName(
    prepared.universitiesCount,
  );
  const fromEmailDisplay = resolvePaymentFromEmailDisplay();

  const resolvedEmailBody = replacePaymentLinkPlaceholder(
    options.input.emailBody.trim(),
    payUrl,
  );

  const emailResult = await sendApplicationPaymentRequestEmail({
    recipientEmail,
    studentFirstName,
    packageDisplayName,
    payUrl,
    amountAed: prepared.amountAed,
    senderName: options.actorName,
    fromEmailDisplay,
    bodyOverride: resolvedEmailBody,
  });

  if ("error" in emailResult) {
    return { ok: false, error: emailResult.error };
  }

  const dueLabel = new Date(`${prepared.dueDate}T12:00:00`).toLocaleDateString(
    undefined,
    { day: "numeric", month: "short", year: "numeric" },
  );

  await options.logActivity(prepared.secret, {
    applicationId: prepared.applicationId,
    studentId: prepared.studentId,
    message: `${options.actorName} sent a ${prepared.amountAed.toLocaleString()} AED payment request to ${recipientEmail} for application #${prepared.applicationId} (due ${dueLabel}). Package: ${prepared.universitiesCount} universities.`,
  });

  // Keep status as `lead` until payment completes or Activate is used.
  return { ok: true, email: recipientEmail };
}
