"use server";

import {
  APPLICATION_ACTIVITY_ENTITY_TYPE,
  applicationActivityEntityId,
} from "@/lib/application-activity-log";
import {
  assertAdvisorAccess,
  assertAdvisorAssignedApplication,
} from "@/lib/advisor-access";
import { sendApplicationPaymentRequestCore } from "@/lib/application-payment-request-core";
import type { SendPaymentRequestInput } from "@/lib/payment-request-email-content";
import { createSupabaseServerClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type AdvisorPaymentActionResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

function revalidateApplicationPaths(applicationId: number) {
  revalidatePath("/advisor/applications");
  revalidatePath(`/advisor/applications/${applicationId}`);
  revalidatePath("/advisor/payments");
  revalidatePath("/advisor/leads");
  revalidatePath("/advisor/students");
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
    logActivity: async (secret, params) => {
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
        console.error("[sendAdvisorApplicationPaymentRequest] activity log", logErr);
      }
    },
  });

  if (result.ok) {
    revalidateApplicationPaths(input.applicationId);
  }

  return result;
}
