"use server";

import type { GeneralResponse } from "@/utils/response";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizePriority(raw: string): "high" | "medium" | "low" {
  const x = raw.trim().toLowerCase();
  if (x === "high" || x === "low") return x;
  return "medium";
}

async function requireSchoolAdminSchoolId(): Promise<
  { schoolId: string; userId: string } | { error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { error: "You must be signed in." };
  }

  const { data: sap, error } = await supabase
    .from("school_admin_profiles")
    .select("school_id, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[school-tasks] school_admin_profiles", error);
    return { error: "Could not load your school admin profile." };
  }

  if (!sap?.school_id) {
    return { error: "Your account is not linked to a school." };
  }

  return { schoolId: sap.school_id, userId: user.id };
}

async function assertStudentInSchool(
  secret: Awaited<ReturnType<typeof createSupabaseSecretClient>>,
  studentId: string,
  schoolId: string,
): Promise<boolean> {
  const { data } = await secret
    .from("student_profiles")
    .select("id")
    .eq("id", studentId)
    .eq("school_id", schoolId)
    .maybeSingle();
  return Boolean(data);
}

export async function createSchoolStudentTask(
  _prev: GeneralResponse<null> | null,
  formData: FormData,
): Promise<GeneralResponse<null>> {
  const auth = await requireSchoolAdminSchoolId();
  if ("error" in auth) {
    return { data: null, error: auth.error };
  }

  const studentId = String(formData.get("student_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
<<<<<<< HEAD
  const notesRaw = String(
    formData.get("notes") ?? formData.get("description") ?? "",
  ).trim();
=======
  const notesRaw = String(formData.get("notes") ?? "").trim();
>>>>>>> a34ce0b284aed09555890a787d1fb49e14c42ece
  const dueRaw = String(formData.get("due_date") ?? "").trim();
  const priority = normalizePriority(String(formData.get("priority") ?? ""));

  if (!UUID_RE.test(studentId)) {
    return { data: null, error: "Pick a student." };
  }
  if (!title) {
    return { data: null, error: "Describe the task." };
  }
  if (notesRaw.length > 4000) {
    return {
      data: null,
      error: "Notes must be at most 4000 characters.",
    };
  }

  const secret = await createSupabaseSecretClient();

  const okStudent = await assertStudentInSchool(
    secret,
    studentId,
    auth.schoolId,
  );
  if (!okStudent) {
    return { data: null, error: "That student is not at your school." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: sap } = await supabase
    .from("school_admin_profiles")
    .select("first_name, last_name")
    .eq("id", auth.userId)
    .maybeSingle();

  const assignedBy =
    `${sap?.first_name?.trim() ?? ""} ${sap?.last_name?.trim() ?? ""}`.trim() ||
    null;

  const due_date = dueRaw && /^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? dueRaw : null;
<<<<<<< HEAD
  const notes =
    notesRaw.length > 8000
      ? notesRaw.slice(0, 8000)
      : notesRaw || null;
=======
>>>>>>> a34ce0b284aed09555890a787d1fb49e14c42ece

  const { error: insErr } = await secret
    .from("student_my_application_tasks")
    .insert({
      student_id: studentId,
      title,
<<<<<<< HEAD
      notes,
=======
      notes: notesRaw || null,
>>>>>>> a34ce0b284aed09555890a787d1fb49e14c42ece
      priority,
      due_date,
      assigned_by_name: assignedBy,
    });

  if (insErr) {
    console.error("[createSchoolStudentTask]", insErr);
    return { data: null, error: "Could not create the task." };
  }

  return { data: null, error: null };
}

export async function toggleSchoolStudentTask(
  taskId: string,
): Promise<{ ok: true } | { error: string }> {
  if (!UUID_RE.test(taskId)) {
    return { error: "Invalid task." };
  }

  const auth = await requireSchoolAdminSchoolId();
  if ("error" in auth) {
    return { error: auth.error };
  }

  const secret = await createSupabaseSecretClient();

  const { data: task, error: tErr } = await secret
    .from("student_my_application_tasks")
    .select("id, student_id, completed")
    .eq("id", taskId)
    .maybeSingle();

  if (tErr || !task) {
    return { error: "Task not found." };
  }

  const okStudent = await assertStudentInSchool(
    secret,
    task.student_id,
    auth.schoolId,
  );
  if (!okStudent) {
    return { error: "You do not have access to this task." };
  }

  const next = !task.completed;
  const now = new Date().toISOString();

  const { error: upErr } = await secret
    .from("student_my_application_tasks")
    .update({
      completed: next,
      completed_at: next ? now : null,
      updated_at: now,
    })
    .eq("id", taskId);

  if (upErr) {
    console.error("[toggleSchoolStudentTask]", upErr);
    return { error: "Could not update the task." };
  }

  return { ok: true };
}
