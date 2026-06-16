"use server";

import {
  parseApplicationId,
  parseApplicationTaskId,
  toggleApplicationTaskCompletedCore,
  createApplicationTaskCore,
  type CallsTasksActionResult,
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

export async function toggleAdminApplicationTaskCompleted(
  taskIdRaw: string,
  completed: boolean,
): Promise<CallsTasksActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const taskId = parseApplicationTaskId(taskIdRaw);
  if (!taskId) return { ok: false, error: "Invalid task." };

  const secret = await createSupabaseSecretClient();
  const result = await toggleApplicationTaskCompletedCore(secret, taskId, completed, {
    actorName: access.actorName,
    adminId: access.userId,
  });

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}

export async function createAdminApplicationTask(
  applicationIdRaw: string,
  titleRaw: string,
  dueDateRaw: string | null,
  priorityRaw: string,
): Promise<CallsTasksActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const applicationId = parseApplicationId(applicationIdRaw);
  if (applicationId == null) return { ok: false, error: "Invalid application." };

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
      userId: access.userId,
      actorName: access.actorName,
      authorRole: "admin",
      adminId: access.userId,
    },
  );

  if (result.ok) revalidateApplicationPaths(applicationId);
  return result;
}
