"use server";

import {
  parseApplicationId,
  parseApplicationTaskId,
  toggleApplicationTaskCompletedCore,
  type CallsTasksActionResult,
} from "@/lib/application-calls-tasks-actions-core";
import { ACTIVE_APPLICATION_STATUSES } from "@/lib/application-support-intake";
import {
  buildCreateUniversityTargetInput,
  createUniversityTargetCore,
  type UniversityTargetActionResult,
} from "@/lib/application-university-target-actions-core";
import { searchUniversitiesCatalog } from "@/lib/search-universities-catalog";
import { requireStudentSession } from "@/lib/student-ai-usage-log";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

function revalidateStudentApplicationSupport() {
  revalidatePath("/student/application-support");
}

async function loadStudentDisplayName(
  secret: Awaited<ReturnType<typeof createSupabaseSecretClient>>,
  studentId: string,
): Promise<string> {
  const { data } = await secret
    .from("student_profiles")
    .select("first_name, last_name")
    .eq("id", studentId)
    .maybeSingle();
  const name = [data?.first_name?.trim(), data?.last_name?.trim()]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || "Student";
}

export async function assertStudentOwnsActiveApplication(
  applicationId: number,
): Promise<
  | { ok: true; studentId: string; studentName: string }
  | { ok: false; error: string }
> {
  const auth = await requireStudentSession();
  if (!auth.ok) return { ok: false, error: auth.message };

  const secret = await createSupabaseSecretClient();
  const { data, error } = await secret
    .from("applications")
    .select("id, student_id, status")
    .eq("id", applicationId)
    .eq("student_id", auth.studentId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "Application not found." };
  }

  const status = data.status?.trim() ?? "";
  if (!(ACTIVE_APPLICATION_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: "Application is not active." };
  }

  const studentName = await loadStudentDisplayName(secret, auth.studentId);
  return { ok: true, studentId: auth.studentId, studentName };
}

export async function searchStudentUniversitiesForApplication(
  query: string,
): Promise<
  | { ok: true; results: Awaited<ReturnType<typeof searchUniversitiesCatalog>> }
  | { ok: false; error: string }
> {
  const auth = await requireStudentSession();
  if (!auth.ok) return { ok: false, error: auth.message };
  return { ok: true, results: await searchUniversitiesCatalog(query) };
}

export async function createStudentUniversityTarget(
  applicationIdRaw: string,
  input: {
    universityId?: string | null;
    universityName: string;
    program?: string | null;
    countryCode?: string | null;
    deadline?: string | null;
    portalUrl?: string | null;
    status: string;
    notes?: string | null;
    documentNames?: string[];
  },
): Promise<UniversityTargetActionResult> {
  const applicationId = parseApplicationId(applicationIdRaw);
  if (applicationId == null) return { ok: false, error: "Invalid application." };

  const ownership = await assertStudentOwnsActiveApplication(applicationId);
  if (!ownership.ok) return ownership;

  const built = buildCreateUniversityTargetInput(input);
  if ("error" in built) return { ok: false, error: built.error };

  const secret = await createSupabaseSecretClient();
  const result = await createUniversityTargetCore(
    secret,
    applicationId,
    built,
    ownership.studentName,
    null,
  );

  if (result.ok) {
    revalidateStudentApplicationSupport();
  }

  return result;
}

export async function toggleStudentApplicationTask(
  taskIdRaw: string,
  completed: boolean,
): Promise<CallsTasksActionResult> {
  const auth = await requireStudentSession();
  if (!auth.ok) return { ok: false, error: auth.message };

  const taskId = parseApplicationTaskId(taskIdRaw);
  if (!taskId) return { ok: false, error: "Invalid task." };

  const secret = await createSupabaseSecretClient();
  const { data: task, error } = await secret
    .from("application_tasks")
    .select("id, application_id")
    .eq("id", taskId)
    .maybeSingle();

  if (error || !task) {
    return { ok: false, error: "Task not found." };
  }

  const ownership = await assertStudentOwnsActiveApplication(task.application_id);
  if (!ownership.ok) return ownership;

  const result = await toggleApplicationTaskCompletedCore(secret, taskId, completed, {
    actorName: ownership.studentName,
  });

  if (result.ok) {
    revalidateStudentApplicationSupport();
  }

  return result;
}
