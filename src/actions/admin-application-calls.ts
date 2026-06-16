"use server";

import {
  deleteApplicationCallCore,
  logApplicationCallCore,
  parseApplicationId,
  updateApplicationCallCore,
  updateApplicationCallStatusCore,
  type CallsTasksActionResult,
  type LogApplicationCallInput,
  type UpdateApplicationCallInput,
} from "@/lib/application-calls-tasks-actions-core";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

async function assertAdminAccess() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false as const, error: "You must be signed in." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: admin, error } = await secret
    .from("admins")
    .select("id, first_name, last_name, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !admin) {
    return { ok: false as const, error: "You do not have permission to manage applications." };
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
  revalidatePath(`/admin/applications/${applicationId}`);
}

export async function logAdminApplicationCall(
  input: Omit<LogApplicationCallInput, "applicationId"> & { applicationId: string },
): Promise<CallsTasksActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const applicationId = parseApplicationId(input.applicationId);
  if (applicationId == null) return { ok: false, error: "Invalid application." };

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
      userId: access.userId,
      actorName: access.actorName,
      authorRole: "admin",
      adminId: access.userId,
    },
  );

  if (result.ok) revalidateApplicationPaths(applicationId);
  return result;
}

export async function updateAdminApplicationCall(
  input: UpdateApplicationCallInput,
): Promise<CallsTasksActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const secret = await createSupabaseSecretClient();
  const result = await updateApplicationCallCore(secret, input, {
    actorName: access.actorName,
    adminId: access.userId,
  });

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}

export async function updateAdminApplicationCallStatus(
  callId: string,
  status: string,
): Promise<CallsTasksActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const secret = await createSupabaseSecretClient();
  const result = await updateApplicationCallStatusCore(secret, callId, status, {
    actorName: access.actorName,
    adminId: access.userId,
  });

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}

export async function deleteAdminApplicationCall(
  callId: string,
): Promise<CallsTasksActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const secret = await createSupabaseSecretClient();
  const result = await deleteApplicationCallCore(secret, callId, {
    actorName: access.actorName,
    adminId: access.userId,
  });

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}
