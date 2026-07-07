import "server-only";

import { createApplicationCheckoutSession } from "@/lib/stripe/create-application-checkout-session";
import {
  expireOverduePendingPayments,
  isPaymentOverdue,
} from "@/lib/payment-request-utils";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

type PlanEmbed =
  | { name: string; universities_count: number }
  | { name: string; universities_count: number }[]
  | null;

type AppEmbed = {
  id: number;
  student_name: string | null;
  student_email: string | null;
  student_profiles:
    | { email: string | null }
    | { email: string | null }[]
    | null;
  applications_plans: PlanEmbed;
};

function firstEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

function resolvePackageLabel(app: AppEmbed): string {
  const plan = firstEmbed(app.applications_plans);
  if (!plan) return "";
  const count = plan.universities_count;
  if (Number.isFinite(count) && count > 0) {
    return `${count} ${count === 1 ? "university" : "universities"}`;
  }
  return plan.name?.trim() || "";
}

function resolveStudentEmail(app: AppEmbed): string {
  const profile = firstEmbed(app.student_profiles);
  const fromProfile = profile?.email?.trim();
  if (fromProfile) return fromProfile;
  return app.student_email?.trim() || "";
}

export type ResolveApplicationPaymentCheckoutResult =
  | { type: "redirect"; url: string }
  | { type: "redirect_success"; applicationId: number }
  | { type: "error"; message: string };

export async function resolveApplicationPaymentCheckout(
  token: string,
): Promise<ResolveApplicationPaymentCheckoutResult> {
  const trimmed = token.trim();
  if (!trimmed) {
    return { type: "error", message: "This payment link is invalid." };
  }

  const secret = await createSupabaseSecretClient();

  const { data: payment, error } = await secret
    .from("payments")
    .select(
      `
      id,
      application_id,
      status,
      amount,
      due_date,
      applications!inner (
        id,
        student_name,
        student_email,
        applications_plans ( name, universities_count ),
        student_profiles ( email )
      )
    `,
    )
    .eq("payment_request_token", trimmed)
    .maybeSingle();

  if (error) {
    console.error("[resolveApplicationPaymentCheckout] fetch", error);
    return { type: "error", message: "Could not load payment details." };
  }

  if (!payment) {
    return {
      type: "error",
      message: "This payment link is invalid or has expired.",
    };
  }

  const app = firstEmbed(
    payment.applications as AppEmbed | AppEmbed[] | null,
  );
  if (!app) {
    return { type: "error", message: "Application not found for this payment." };
  }

  if (payment.status === "paid") {
    return { type: "redirect_success", applicationId: app.id };
  }

  if (payment.status === "failed") {
    return {
      type: "error",
      message:
        "This payment could not be completed. Please contact support for assistance.",
    };
  }

  if (isPaymentOverdue(payment)) {
    await expireOverduePendingPayments(secret, { applicationId: app.id });
    return {
      type: "error",
      message: "This payment link has expired. Please contact your advisor for a new request.",
    };
  }

  const customerEmail = resolveStudentEmail(app);
  if (!customerEmail) {
    return {
      type: "error",
      message: "No email is on file for this application. Please contact support.",
    };
  }

  const checkout = await createApplicationCheckoutSession({
    paymentId: payment.id,
    applicationId: app.id,
    customerEmail,
    packageLabel: resolvePackageLabel(app),
    amountAed: payment.amount,
  });

  if (!checkout.ok) {
    return { type: "error", message: checkout.error };
  }

  const { error: updateErr } = await secret
    .from("payments")
    .update({
      stripe_checkout_session_id: checkout.sessionId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  if (updateErr) {
    console.error("[resolveApplicationPaymentCheckout] session save", updateErr);
  }

  return { type: "redirect", url: checkout.url };
}
