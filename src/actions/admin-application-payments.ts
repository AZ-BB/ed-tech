"use server";

import {
  APPLICATION_ACTIVITY_ENTITY_TYPE,
  applicationActivityEntityId,
} from "@/lib/application-activity-log";
import { isResendConfigured } from "@/lib/resend/config";
import { sendApplicationPaymentRequestEmail } from "@/lib/resend/application-payment-request-email";
import { buildApplicationPaymentUrl } from "@/lib/resend/site-url";
import { isStripeConfigured } from "@/lib/stripe/config";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

type AdminPaymentActionResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

async function assertAdminAccess() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false as const, error: "You must be signed in." };
  }

  const service = await createSupabaseSecretClient();
  const { data: admin, error: adminError } = await service
    .from("admins")
    .select("id, first_name, last_name, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("[admin-application-payments] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return {
      ok: false as const,
      error: "You do not have permission to manage applications.",
    };
  }

  if (admin.is_active === false) {
    return { ok: false as const, error: "Your admin account is inactive." };
  }

  return {
    ok: true as const,
    userId: user.id,
    actorName:
      [admin.first_name, admin.last_name].filter(Boolean).join(" ").trim() || "Admin",
  };
}

function parseApplicationId(raw: number): number | null {
  if (!Number.isFinite(raw) || raw < 1) return null;
  return Math.trunc(raw);
}

function parseAmountAed(raw: number): number | null {
  if (!Number.isFinite(raw) || raw <= 0) return null;
  const rounded = Math.round(raw * 100) / 100;
  return rounded;
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
  plan:
    | { price: number }
    | { price: number }[]
    | null,
): number {
  const row = firstEmbed(plan);
  if (!row || !Number.isFinite(row.price) || row.price <= 0) return 0;
  return row.price;
}

function resolveStudentName(
  application: { student_name: string | null },
  profile: { first_name: string; last_name: string } | null,
): string {
  if (profile) {
    const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
    if (name) return name;
  }
  return application.student_name?.trim() || "Student";
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
  revalidatePath("/admin/applications");
  revalidatePath("/admin/applications/paid");
  revalidatePath(`/admin/applications/${applicationId}`);
}

export async function sendApplicationPaymentRequest(
  applicationIdRaw: number,
  amountAedRaw: number,
): Promise<AdminPaymentActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const applicationId = parseApplicationId(applicationIdRaw);
  if (applicationId == null) {
    return { ok: false, error: "Invalid application." };
  }

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
    .maybeSingle();

  if (appErr || !application) {
    console.error("[sendApplicationPaymentRequest] application", appErr);
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
    console.error("[sendApplicationPaymentRequest] payment", payErr);
    return { ok: false, error: "Could not load payment records." };
  }

  const totalPaid = (existingPayments ?? [])
    .filter((row) => row.status === "paid")
    .reduce((sum, row) => sum + (row.amount ?? 0), 0);

  const remainingBalance = Math.max(0, Math.round((planPrice - totalPaid) * 100) / 100);

  if (remainingBalance <= 0) {
    return { ok: false, error: "This application has already been fully paid." };
  }

  if (amountAed > remainingBalance) {
    return {
      ok: false,
      error: `Amount cannot exceed the remaining balance of ${remainingBalance.toLocaleString()} AED.`,
    };
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
        updated_at: now,
      })
      .eq("id", reusablePayment.id);

    if (updateErr) {
      console.error("[sendApplicationPaymentRequest] token update", updateErr);
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
    });

    if (insertErr) {
      console.error("[sendApplicationPaymentRequest] insert", insertErr);
      return { ok: false, error: "Could not create payment request." };
    }
  }

  const payUrl = await buildApplicationPaymentUrl(token);
  const studentName = resolveStudentName(application, profile);
  const packageLabel = resolvePackageLabel(application.applications_plans);

  const emailResult = await sendApplicationPaymentRequestEmail({
    to: studentEmail,
    studentName,
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
    message: `${access.actorName} sent a ${amountAed.toLocaleString()} AED payment request to ${studentEmail} for application #${applicationId}.`,
    created_by_type: "admin",
    admin_id: access.userId,
    school_admin_id: null,
    student_id: application.student_id,
  });

  if (logErr) {
    console.error("[sendApplicationPaymentRequest] activity log", logErr);
  }

  revalidateApplicationPaths(applicationId);

  return { ok: true, email: studentEmail };
}
