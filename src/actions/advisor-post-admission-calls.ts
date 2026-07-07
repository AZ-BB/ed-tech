"use server";

import {
  assertAdvisorAccess,
  assertAdvisorAssignedPostAdmissionCase,
} from "@/lib/advisor-access";
import {
  logPostAdmissionCallCore,
  parsePostAdmissionCaseId,
  type LogPostAdmissionCallInput,
} from "@/lib/post-admission-calls-actions-core";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

function revalidatePostAdmissionPaths(caseId: number) {
  revalidatePath("/advisor/post-admission");
  revalidatePath(`/advisor/post-admission/${caseId}`);
}

export async function logAdvisorPostAdmissionCall(
  input: Omit<LogPostAdmissionCallInput, "caseId"> & { caseId: string },
) {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;

  const caseId = parsePostAdmissionCaseId(input.caseId);
  if (caseId == null) return { ok: false as const, error: "Invalid case." };

  const assignment = await assertAdvisorAssignedPostAdmissionCase(
    access.advisorId,
    caseId,
  );
  if (!assignment.ok) return assignment;

  const secret = await createSupabaseSecretClient();
  const result = await logPostAdmissionCallCore(
    secret,
    {
      caseId,
      callType: input.callType,
      durationMinutes: input.durationMinutes,
      callDate: input.callDate,
      status: input.status,
      outcome: input.outcome,
      summary: input.summary,
    },
    {
      userId: access.advisorId,
      actorName: access.advisorName,
      authorRole: "advisor",
    },
  );

  if (result.ok) revalidatePostAdmissionPaths(caseId);
  return result;
}
