"use server";

import {
  APPLICATION_ACTIVITY_ENTITY_TYPE,
  applicationActivityEntityId,
} from "@/lib/application-activity-log";
import { sendApplicationPaymentRequestCore } from "@/lib/application-payment-request-core";
import type { SendPaymentRequestInput } from "@/lib/payment-request-email-content";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
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

function revalidateApplicationPaths(applicationId: number) {
  revalidatePath("/admin/applications");
  revalidatePath("/admin/applications/paid");
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/advisor/applications");
  revalidatePath(`/advisor/applications/${applicationId}`);
}

export async function sendApplicationPaymentRequest(
  input: SendPaymentRequestInput,
): Promise<AdminPaymentActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const result = await sendApplicationPaymentRequestCore({
    applicationId: input.applicationId,
    input,
    actorName: access.actorName,
    actorUserId: access.userId,
    actorRole: "admin",
    requestedByType: "admin",
    requestedByAdvisorId: null,
    assertApplicationAccess: async (secret, applicationId) => {
      const { data, error } = await secret
        .from("applications")
        .select("id")
        .eq("id", applicationId)
        .maybeSingle();

      if (error || !data) {
        console.error("[sendApplicationPaymentRequest] application", error);
        return { ok: false, error: "Application not found." };
      }
      return { ok: true };
    },
    logActivity: async (secret, params) => {
      const { error: logErr } = await secret.from("acitivity_logs").insert({
        entitiy_type: APPLICATION_ACTIVITY_ENTITY_TYPE,
        entity_id: applicationActivityEntityId(params.applicationId),
        action: "payment_request_sent",
        message: params.message,
        created_by_type: "admin",
        admin_id: access.userId,
        school_admin_id: null,
        student_id: params.studentId,
      });
      if (logErr) {
        console.error("[sendApplicationPaymentRequest] activity log", logErr);
      }
    },
  });

  if (result.ok) {
    revalidateApplicationPaths(input.applicationId);
  }

  return result;
}
