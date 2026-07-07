"use server";

import { sendPostAdmissionPaymentRequestCore } from "@/lib/post-admission-payment-request-core";
import type { PostAdmissionSendPaymentRequestInput } from "@/components/post-admission-support/send-post-admission-payment-request-dialog";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

function revalidatePostAdmissionPaths(caseId: number) {
  revalidatePath("/admin/post-admission");
  revalidatePath(`/admin/post-admission/${caseId}`);
  revalidatePath("/advisor/leads");
}

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

  if (adminError || !admin) {
    return { ok: false as const, error: "You do not have permission." };
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

export async function sendPostAdmissionPaymentRequest(
  input: PostAdmissionSendPaymentRequestInput,
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const admin = await assertAdminAccess();
  if (!admin.ok) return admin;

  const result = await sendPostAdmissionPaymentRequestCore({
    caseId: input.caseId,
    input: {
      applicationId: input.caseId,
      planId: 0,
      amountAed: input.amountAed,
      dueDate: input.dueDate,
      emailBody: input.emailBody,
      internalNote: input.internalNote,
    },
    actorName: admin.actorName,
    actorUserId: admin.userId,
    actorRole: "admin",
    requestedByType: "admin",
    requestedByAdvisorId: null,
    assertCaseAccess: async (svc) => {
      const { data } = await svc
        .from("post_admission_cases")
        .select("id")
        .eq("id", input.caseId)
        .maybeSingle();
      if (!data) return { ok: false, error: "Case not found." };
      return { ok: true };
    },
  });

  if (result.ok) {
    revalidatePostAdmissionPaths(input.caseId);
  }

  return result;
}
