"use server";

import {
  assertAdvisorAccess,
  assertAdvisorAssignedApplication,
} from "@/lib/advisor-access";
import {
  deleteApplicationCallCore,
  logApplicationCallCore,
  parseApplicationCallId,
  parseApplicationId,
  updateApplicationCallCore,
  updateApplicationCallStatusCore,
  type CallsTasksActionResult,
  type LogApplicationCallInput,
  type UpdateApplicationCallInput,
} from "@/lib/application-calls-tasks-actions-core";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

function revalidateApplicationPaths(applicationId: number) {
  revalidatePath("/advisor/applications");
  revalidatePath(`/advisor/applications/${applicationId}`);
}

async function assertAdvisorCanAccessCall(
  callId: string,
): Promise<
  | { ok: true; advisorId: string; advisorName: string }
  | { ok: false; error: string }
> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;

  const parsedCallId = parseApplicationCallId(callId);
  if (!parsedCallId) return { ok: false, error: "Invalid call." };

  const secret = await createSupabaseSecretClient();
  const { data: call, error } = await secret
    .from("application_calls")
    .select("application_id")
    .eq("id", parsedCallId)
    .maybeSingle();

  if (error || !call) {
    return { ok: false, error: "Call not found." };
  }

  const assignment = await assertAdvisorAssignedApplication(
    access.advisorId,
    call.application_id,
  );
  if (!assignment.ok) return assignment;

  return {
    ok: true,
    advisorId: access.advisorId,
    advisorName: access.advisorName,
  };
}

export async function logAdvisorApplicationCall(
  input: Omit<LogApplicationCallInput, "applicationId"> & { applicationId: string },
): Promise<CallsTasksActionResult> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;

  const applicationId = parseApplicationId(input.applicationId);
  if (applicationId == null) return { ok: false, error: "Invalid application." };

  const assignment = await assertAdvisorAssignedApplication(access.advisorId, applicationId);
  if (!assignment.ok) return assignment;

  const secret = await createSupabaseSecretClient();
  const result = await logApplicationCallCore(
    secret,
    {
      applicationId,
      callType: input.callType,
      durationMinutes: input.durationMinutes,
      callDate: input.callDate,
      status: input.status,
      outcome: input.outcome,
      summary: input.summary,
      createFollowUpTask: input.createFollowUpTask,
      followUpTaskTitle: input.followUpTaskTitle,
      followUpTaskDueDate: input.followUpTaskDueDate,
    },
    {
      userId: access.advisorId,
      actorName: access.advisorName,
      authorRole: "advisor",
    },
  );

  if (result.ok) revalidateApplicationPaths(applicationId);
  return result;
}

export async function updateAdvisorApplicationCall(
  input: UpdateApplicationCallInput,
): Promise<CallsTasksActionResult> {
  const access = await assertAdvisorCanAccessCall(input.callId);
  if (!access.ok) return access;

  const secret = await createSupabaseSecretClient();
  const result = await updateApplicationCallCore(secret, input, {
    actorName: access.advisorName,
  });

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}

export async function updateAdvisorApplicationCallStatus(
  callId: string,
  status: string,
): Promise<CallsTasksActionResult> {
  const access = await assertAdvisorCanAccessCall(callId);
  if (!access.ok) return access;

  const secret = await createSupabaseSecretClient();
  const result = await updateApplicationCallStatusCore(secret, callId, status, {
    actorName: access.advisorName,
  });

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}

export async function deleteAdvisorApplicationCall(
  callId: string,
): Promise<CallsTasksActionResult> {
  const access = await assertAdvisorCanAccessCall(callId);
  if (!access.ok) return access;

  const secret = await createSupabaseSecretClient();
  const result = await deleteApplicationCallCore(secret, callId, {
    actorName: access.advisorName,
  });

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}
