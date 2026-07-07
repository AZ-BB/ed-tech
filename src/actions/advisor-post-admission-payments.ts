"use server";

import { assertAdvisorAccess, assertAdvisorAssignedPostAdmissionCase } from "@/lib/advisor-access";
import { sendPostAdmissionPaymentRequestCore } from "@/lib/post-admission-payment-request-core";
import type { PostAdmissionSendPaymentRequestInput } from "@/components/post-admission-support/send-post-admission-payment-request-dialog";
import { revalidatePath } from "next/cache";

function revalidatePostAdmissionPaths(caseId: number) {
  revalidatePath("/advisor/post-admission");
  revalidatePath(`/advisor/post-admission/${caseId}`);
  revalidatePath("/advisor/leads");
}

export async function sendAdvisorPostAdmissionPaymentRequest(
  input: PostAdmissionSendPaymentRequestInput,
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;

  const assignment = await assertAdvisorAssignedPostAdmissionCase(
    access.advisorId,
    input.caseId,
  );
  if (!assignment.ok) return assignment;

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
    actorName: access.advisorName,
    actorUserId: access.advisorId,
    actorRole: "advisor",
    requestedByType: "advisor",
    requestedByAdvisorId: access.advisorId,
    assertCaseAccess: async () => assignment,
  });

  if (result.ok) {
    revalidatePostAdmissionPaths(input.caseId);
  }

  return result;
}
