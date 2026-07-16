"use server";

import {
  APPLICATION_ACTIVITY_ENTITY_TYPE,
  applicationActivityEntityId,
} from "@/lib/application-activity-log";
import {
  assertAdvisorAccess,
  assertAdvisorAssignedApplication,
} from "@/lib/advisor-access";
import {
  activateApplicationPackageOffline,
  type ActivateApplicationPackageInput,
} from "@/lib/activate-application-package-offline";
import {
  recordManualApplicationPayment,
  type RecordManualApplicationPaymentInput,
} from "@/lib/record-manual-application-payment";
import { sendApplicationPaymentRequestCore } from "@/lib/application-payment-request-core";
import {
  createApplicationPaymentLinkCore,
  sendLeadApplicationPaymentRequestCore,
} from "@/lib/lead-application-payment-request-core";
import type {
  LeadApplicationPaymentEmailInput,
  LeadApplicationPaymentLinkInput,
} from "@/lib/lead-application-payment-types";
import type { SendPaymentRequestInput } from "@/lib/payment-request-email-content";
import { createSupabaseServerClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type AdvisorPaymentActionResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

type AdvisorPaymentLinkActionResult =
  | { ok: true; payUrl: string }
  | { ok: false; error: string };

type AdvisorActivateActionResult = { ok: true } | { ok: false; error: string };

function revalidateApplicationPaths(applicationId: number) {
  revalidatePath("/advisor/applications");
  revalidatePath(`/advisor/applications/${applicationId}`);
  revalidatePath("/advisor/payments");
  revalidatePath("/advisor/leads");
  revalidatePath("/advisor/packages");
  revalidatePath("/advisor/students");
  revalidatePath("/advisor/sessions-and-calls");
}

async function logAdvisorPaymentActivity(
  secret: Awaited<
    ReturnType<typeof import("@/utils/supabase-server").createSupabaseSecretClient>
  >,
  params: {
    applicationId: number;
    studentId: string;
    message: string;
  },
) {
  const { error: logErr } = await secret.from("acitivity_logs").insert({
    entitiy_type: APPLICATION_ACTIVITY_ENTITY_TYPE,
    entity_id: applicationActivityEntityId(params.applicationId),
    action: "payment_request_sent",
    message: params.message,
    created_by_type: "admin",
    admin_id: null,
    school_admin_id: null,
    student_id: params.studentId,
  });
  if (logErr) {
    console.error("[advisor-application-payments] activity log", logErr);
  }
}

export async function sendAdvisorApplicationPaymentRequest(
  input: SendPaymentRequestInput,
): Promise<AdvisorPaymentActionResult> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return { ok: false, error: "You must be signed in." };
  }

  const result = await sendApplicationPaymentRequestCore({
    applicationId: input.applicationId,
    input,
    actorName: access.advisorName,
    actorUserId: user.id,
    actorRole: "advisor",
    requestedByType: "advisor",
    requestedByAdvisorId: access.advisorId,
    assertApplicationAccess: async (_secret, applicationId) => {
      const assignment = await assertAdvisorAssignedApplication(
        access.advisorId,
        applicationId,
      );
      return assignment;
    },
    logActivity: logAdvisorPaymentActivity,
  });

  if (result.ok) {
    revalidateApplicationPaths(input.applicationId);
  }

  return result;
}

/** Generate a shareable pay URL for a lead (no email). */
export async function createAdvisorApplicationPaymentLink(
  input: LeadApplicationPaymentLinkInput,
): Promise<AdvisorPaymentLinkActionResult> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;

  const result = await createApplicationPaymentLinkCore({
    input,
    actorName: access.advisorName,
    requestedByType: "advisor",
    requestedByAdvisorId: access.advisorId,
    assertApplicationAccess: async (_secret, applicationId) => {
      return assertAdvisorAssignedApplication(access.advisorId, applicationId);
    },
    logActivity: logAdvisorPaymentActivity,
  });

  if (result.ok) {
    revalidateApplicationPaths(input.applicationId);
  }

  return result;
}

/** Send a payment request email for a lead with editable recipient. */
export async function sendAdvisorLeadApplicationPaymentRequest(
  input: LeadApplicationPaymentEmailInput,
): Promise<AdvisorPaymentActionResult> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;

  const result = await sendLeadApplicationPaymentRequestCore({
    input,
    actorName: access.advisorName,
    requestedByType: "advisor",
    requestedByAdvisorId: access.advisorId,
    assertApplicationAccess: async (_secret, applicationId) => {
      return assertAdvisorAssignedApplication(access.advisorId, applicationId);
    },
    logActivity: logAdvisorPaymentActivity,
  });

  if (result.ok) {
    revalidateApplicationPaths(input.applicationId);
  }

  return result;
}

/** Record an offline paid payment and move the lead to Paying Customers. */
export async function activateAdvisorApplicationPackage(
  input: ActivateApplicationPackageInput,
): Promise<AdvisorActivateActionResult> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;

  const assignment = await assertAdvisorAssignedApplication(
    access.advisorId,
    input.applicationId,
  );
  if (!assignment.ok) return assignment;

  const result = await activateApplicationPackageOffline({
    input,
    advisorId: access.advisorId,
    advisorName: access.advisorName,
  });

  if (!result.ok) return result;

  revalidateApplicationPaths(input.applicationId);
  return { ok: true };
}

/** Record a manual paid payment for a lead or active application. */
export async function recordAdvisorManualApplicationPayment(
  input: RecordManualApplicationPaymentInput,
): Promise<AdvisorActivateActionResult> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;

  const assignment = await assertAdvisorAssignedApplication(
    access.advisorId,
    input.applicationId,
  );
  if (!assignment.ok) return assignment;

  const result = await recordManualApplicationPayment({
    input,
    advisorId: access.advisorId,
    advisorName: access.advisorName,
  });

  if (!result.ok) return result;

  revalidateApplicationPaths(input.applicationId);
  return { ok: true };
}
