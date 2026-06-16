"use server";

import {
  assertAdvisorAccess,
  assertAdvisorAssignedApplication,
} from "@/lib/advisor-access";
import {
  createApplicationTaskCore,
  parseApplicationId,
  parseApplicationTaskId,
  toggleApplicationTaskCompletedCore,
  type CallsTasksActionResult,
} from "@/lib/application-calls-tasks-actions-core";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

function revalidateApplicationPaths(applicationId: number) {
  revalidatePath("/advisor/applications");
  revalidatePath(`/advisor/applications/${applicationId}`);
  revalidatePath("/advisor/tasks");
}

async function assertAdvisorCanAccessTask(
  taskId: string,
): Promise<
  | { ok: true; advisorId: string; advisorName: string }
  | { ok: false; error: string }
> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;

  const secret = await createSupabaseSecretClient();
  const { data: task, error } = await secret
    .from("application_tasks")
    .select("application_id")
    .eq("id", taskId)
    .maybeSingle();

  if (error || !task) {
    return { ok: false, error: "Task not found." };
  }

  const assignment = await assertAdvisorAssignedApplication(
    access.advisorId,
    task.application_id,
  );
  if (!assignment.ok) return assignment;

  return {
    ok: true,
    advisorId: access.advisorId,
    advisorName: access.advisorName,
  };
}

export async function toggleAdvisorApplicationTaskCompleted(
  taskIdRaw: string,
  completed: boolean,
): Promise<CallsTasksActionResult> {
  const taskId = parseApplicationTaskId(taskIdRaw);
  if (!taskId) return { ok: false, error: "Invalid task." };

  const access = await assertAdvisorCanAccessTask(taskId);
  if (!access.ok) return access;

  const secret = await createSupabaseSecretClient();
  const result = await toggleApplicationTaskCompletedCore(secret, taskId, completed, {
    actorName: access.advisorName,
  });

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}

export async function createAdvisorApplicationTask(
  applicationIdRaw: string,
  titleRaw: string,
  dueDateRaw: string | null,
  priorityRaw: string,
): Promise<CallsTasksActionResult> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;

  const applicationId = parseApplicationId(applicationIdRaw);
  if (applicationId == null) return { ok: false, error: "Invalid application." };

  const assignment = await assertAdvisorAssignedApplication(access.advisorId, applicationId);
  if (!assignment.ok) return assignment;

  const secret = await createSupabaseSecretClient();
  const result = await createApplicationTaskCore(
    secret,
    {
      applicationId,
      title: titleRaw,
      dueDate: dueDateRaw,
      priority: priorityRaw,
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
