import "server-only";

import { applyFirstPostAdmissionPaymentRequestStatusEffects } from "@/lib/post-admission-status-transitions";
import {
  POST_ADMISSION_ACTIVITY_ENTITY_TYPE,
  postAdmissionActivityEntityId,
} from "@/lib/post-admission-activity-log";
import { isResendConfigured } from "@/lib/resend/config";
import {
  sendPostAdmissionPaymentRequestEmail,
} from "@/lib/resend/post-admission-payment-request-email";
import { resolvePaymentFromEmailDisplay } from "@/lib/resend/application-payment-request-email";
import { buildPostAdmissionPaymentUrl } from "@/lib/resend/site-url";
import {
  replacePaymentLinkPlaceholder,
  validatePaymentRequestEmailBody,
  type SendPaymentRequestInput,
} from "@/lib/payment-request-email-content";
import {
  expireOverduePendingPayments,
  hasActivePendingPaymentRequest,
  parseDueDateInput,
  validateDueDateNotPast,
} from "@/lib/payment-request-utils";
import { isStripeConfigured } from "@/lib/stripe/config";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { randomUUID } from "node:crypto";

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type PostAdmissionPaymentRequestActionResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

function firstEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

function parseCaseId(raw: number): number | null {
  if (!Number.isFinite(raw) || raw < 1) return null;
  return Math.trunc(raw);
}

function parseAmountAed(raw: number): number | null {
  if (!Number.isFinite(raw) || raw <= 0) return null;
  return Math.round(raw * 100) / 100;
}

function resolveStudentFirstName(
  row: { student_name: string | null },
  profile: { first_name: string; last_name: string } | null,
): string {
  const fromProfile = profile?.first_name?.trim();
  if (fromProfile) return fromProfile;
  const fromRow = row.student_name?.trim().split(/\s+/)[0];
  if (fromRow) return fromRow;
  return "there";
}

function resolveStudentEmail(
  row: { student_email: string | null },
  profile: { email: string | null } | null,
): string {
  const fromProfile = profile?.email?.trim();
  if (fromProfile) return fromProfile;
  return row.student_email?.trim() || "";
}

async function insertInternalNote(
  secret: SecretClient,
  caseId: number,
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
  const { error: insertErr } = await secret.from("post_admission_internal_notes").insert({
    post_admission_case_id: caseId,
    student_id: studentId,
    author_user_id: authorUserId,
    author_role: authorRole,
    author_name: authorName,
    content: trimmed,
    visibility: "internal",
    created_at: now,
  });

  if (insertErr) {
    console.error("[sendPostAdmissionPaymentRequestCore] internal note", insertErr);
    return { ok: false, error: "Could not save internal note." };
  }

  await secret
    .from("post_admission_cases")
    .update({ updated_at: now })
    .eq("id", caseId);

  return { ok: true };
}

export type SendPostAdmissionPaymentRequestCoreOptions = {
  caseId: number;
  input: SendPaymentRequestInput;
  actorName: string;
  actorUserId: string;
  actorRole: "advisor" | "admin";
  requestedByType: "advisor" | "admin";
  requestedByAdvisorId: string | null;
  assertCaseAccess: (
    secret: SecretClient,
    caseId: number,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
};

export async function sendPostAdmissionPaymentRequestCore(
  options: SendPostAdmissionPaymentRequestCoreOptions,
): Promise<PostAdmissionPaymentRequestActionResult> {
  const caseId = parseCaseId(options.caseId);
  if (caseId == null) {
    return { ok: false, error: "Invalid post-admission case." };
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

  const access = await options.assertCaseAccess(secret, caseId);
  if (!access.ok) return access;

  const { data: caseRow, error: caseErr } = await secret
    .from("post_admission_cases")
    .select(
      `
      id,
      student_id,
      student_name,
      student_email,
      student_profiles ( first_name, last_name, email )
    `,
    )
    .eq("id", caseId)
    .maybeSingle();

  if (caseErr || !caseRow) {
    console.error("[sendPostAdmissionPaymentRequestCore] case", caseErr);
    return { ok: false, error: "Post-admission case not found." };
  }

  const profile = firstEmbed(caseRow.student_profiles);
  const studentEmail = resolveStudentEmail(caseRow, profile);
  if (!studentEmail) {
    return {
      ok: false,
      error: "This case has no student email on file.",
    };
  }

  await expireOverduePendingPayments(secret, { postAdmissionCaseId: caseId });

  const { data: existingPayments, error: payErr } = await secret
    .from("payments")
    .select("id, status, amount, payment_request_sent_at, payment_request_token, due_date")
    .eq("post_admission_case_id", caseId)
    .order("created_at", { ascending: false });

  if (payErr) {
    console.error("[sendPostAdmissionPaymentRequestCore] payments", payErr);
    return { ok: false, error: "Could not load payment records." };
  }

  if (hasActivePendingPaymentRequest(existingPayments ?? [])) {
    return {
      ok: false,
      error: "This case already has a pending payment request.",
    };
  }

  const hadPriorPaymentRequest = (existingPayments ?? []).some(
    (row) => row.payment_request_sent_at != null,
  );

  const reusablePayment = (existingPayments ?? []).find(
    (row) => row.status === "pending" || row.status === "failed",
  );

  const token = randomUUID();
  const now = new Date().toISOString();

  const paymentPayload = {
    status: "pending" as const,
    payment_request_token: token,
    payment_request_sent_at: now,
    amount: amountAed,
    due_date: dueDate,
    requested_plan_id: null,
    custom_universities_count: null,
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
      console.error("[sendPostAdmissionPaymentRequestCore] token update", updateErr);
      return { ok: false, error: "Could not prepare payment request." };
    }
  } else {
    const { error: insertErr } = await secret.from("payments").insert({
      student_id: caseRow.student_id,
      post_admission_case_id: caseId,
      application_id: null,
      ...paymentPayload,
    });

    if (insertErr) {
      console.error("[sendPostAdmissionPaymentRequestCore] insert", insertErr);
      return { ok: false, error: "Could not create payment request." };
    }
  }

  if (input.internalNote?.trim()) {
    const noteResult = await insertInternalNote(
      secret,
      caseId,
      caseRow.student_id,
      options.actorUserId,
      options.actorRole,
      options.actorName,
      input.internalNote,
    );
    if (!noteResult.ok) return noteResult;
  }

  const payUrl = await buildPostAdmissionPaymentUrl(token);
  const studentFirstName = resolveStudentFirstName(caseRow, profile);
  const fromEmailDisplay = resolvePaymentFromEmailDisplay();

  const resolvedEmailBody = replacePaymentLinkPlaceholder(
    input.emailBody.trim(),
    payUrl,
  );

  const emailResult = await sendPostAdmissionPaymentRequestEmail({
    recipientEmail: studentEmail,
    studentFirstName,
    amountAed,
    dueDate,
    payUrl,
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

  const activityMessage = `${options.actorName} sent a ${amountAed.toLocaleString()} AED payment request to ${studentEmail} for post-admission case #${caseId} (due ${dueLabel}).`;

  const { error: logErr } = await secret.from("acitivity_logs").insert({
    entitiy_type: POST_ADMISSION_ACTIVITY_ENTITY_TYPE,
    entity_id: postAdmissionActivityEntityId(caseId),
    action: "payment_request_sent",
    message: activityMessage,
    created_by_type: "admin",
    admin_id: options.actorRole === "admin" ? options.actorUserId : null,
    school_admin_id: null,
    student_id: caseRow.student_id,
  });

  if (logErr) {
    console.error("[sendPostAdmissionPaymentRequestCore] activity log", logErr);
  }

  if (!hadPriorPaymentRequest) {
    await applyFirstPostAdmissionPaymentRequestStatusEffects(secret, caseId, now);
  }

  return { ok: true, email: studentEmail };
}
