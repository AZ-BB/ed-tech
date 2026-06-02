"use server";

import { GRADE_FILTER_OPTIONS } from "@/lib/school-portal-destination-options";
import type { GeneralResponse } from "@/utils/response";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

const GRADE_ALLOWED = new Set<string>(GRADE_FILTER_OPTIONS);
const BULK_ASSIGN_ALL_SENTINEL = "__all__";
const BULK_ID_CHUNK = 250;
const BULK_INSERT_CHUNK = 250;

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
  const access = await requireTaskManagerAccess();
  if ("error" in access) {
    return access;
  }
  if (access.kind !== "school_admin") {
    return { error: "Your account is not linked to a school." };
  }
  return { schoolId: access.schoolId, userId: access.userId };
}

type TaskManagerAccess =
  | { kind: "school_admin"; schoolId: string; userId: string }
  | { kind: "platform_admin"; userId: string };

async function requireTaskManagerAccess(): Promise<
  TaskManagerAccess | { error: string }
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
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!error && sap?.school_id) {
    return { kind: "school_admin", schoolId: sap.school_id, userId: user.id };
  }

  const secret = await createSupabaseSecretClient();
  const { data: admin, error: adminError } = await secret
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("[school-tasks] admins", adminError);
    return { error: "Could not verify access." };
  }

  if (admin) {
    return { kind: "platform_admin", userId: user.id };
  }

  if (error) {
    console.error("[school-tasks] school_admin_profiles", error);
    return { error: "Could not load your school admin profile." };
  }

  return { error: "Your account is not linked to a school." };
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

async function fetchSchoolStudentIdsForTaskBulk(
  secret: Awaited<ReturnType<typeof createSupabaseSecretClient>>,
  schoolId: string,
  grade: string,
): Promise<string[]> {
  const ids: string[] = [];
  let offset = 0;

  for (;;) {
    let q = secret
      .from("student_profiles")
      .select("id")
      .eq("school_id", schoolId);

    if (grade) {
      q = q.eq("grade", grade);
    }

    const { data, error } = await q
      .order("id", { ascending: true })
      .range(offset, offset + BULK_ID_CHUNK - 1);

    if (error) {
      console.error("[fetchSchoolStudentIdsForTaskBulk]", error);
      throw new Error("Could not load students.");
    }
    if (!data?.length) break;

    for (const row of data) {
      ids.push(row.id);
    }

    if (data.length < BULK_ID_CHUNK) break;
    offset += BULK_ID_CHUNK;
  }

  return ids;
}

async function assertStudentExists(
  secret: Awaited<ReturnType<typeof createSupabaseSecretClient>>,
  studentId: string,
): Promise<boolean> {
  const { data } = await secret
    .from("student_profiles")
    .select("id")
    .eq("id", studentId)
    .maybeSingle();
  return Boolean(data);
}

async function resolveAssignedByName(
  access: TaskManagerAccess,
): Promise<string | null> {
  const supabase = await createSupabaseServerClient();

  if (access.kind === "platform_admin") {
    const secret = await createSupabaseSecretClient();
    const { data: admin } = await secret
      .from("admins")
      .select("first_name, last_name")
      .eq("id", access.userId)
      .maybeSingle();

    return (
      `${admin?.first_name?.trim() ?? ""} ${admin?.last_name?.trim() ?? ""}`.trim() ||
      "Platform admin"
    );
  }

  const { data: sap } = await supabase
    .from("school_admin_profiles")
    .select("first_name, last_name")
    .eq("id", access.userId)
    .maybeSingle();

  return (
    `${sap?.first_name?.trim() ?? ""} ${sap?.last_name?.trim() ?? ""}`.trim() ||
    null
  );
}

export async function createSchoolStudentTask(
  _prev: GeneralResponse<null | { created: number }> | null,
  formData: FormData,
): Promise<GeneralResponse<null | { created: number }>> {
  const auth = await requireTaskManagerAccess();
  if ("error" in auth) {
    return { data: null, error: auth.error };
  }

  const studentId = String(formData.get("student_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const notesRaw = String(formData.get("notes") ?? "").trim();
  const dueRaw = String(formData.get("due_date") ?? "").trim();
  const priority = normalizePriority(String(formData.get("priority") ?? ""));

  if (!title) {
    return { data: null, error: "Describe the task." };
  }
  if (notesRaw.length > 4000) {
    return {
      data: null,
      error: "Notes must be at most 4000 characters.",
    };
  }

  const due_date = dueRaw && /^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? dueRaw : null;
  const notes =
    notesRaw.length > 8000
      ? notesRaw.slice(0, 8000)
      : notesRaw || null;

  const secret = await createSupabaseSecretClient();
  const assignedBy = await resolveAssignedByName(auth);

  if (studentId === BULK_ASSIGN_ALL_SENTINEL) {
    if (auth.kind !== "school_admin") {
      return { data: null, error: "Bulk task assignment is school-admin only." };
    }

    const gradeRaw = String(formData.get("grade") ?? "").trim();
    if (gradeRaw && !GRADE_ALLOWED.has(gradeRaw)) {
      return { data: null, error: "Pick a valid grade." };
    }

    let studentIds: string[];
    try {
      studentIds = await fetchSchoolStudentIdsForTaskBulk(
        secret,
        auth.schoolId,
        gradeRaw,
      );
    } catch {
      return { data: null, error: "Could not load students." };
    }

    if (studentIds.length === 0) {
      return {
        data: null,
        error: gradeRaw
          ? "No students match this grade."
          : "No enrolled students at your school.",
      };
    }

    const rows = studentIds.map((id) => ({
      student_id: id,
      title,
      notes,
      priority,
      due_date,
      assigned_by_name: assignedBy,
    }));

    for (let i = 0; i < rows.length; i += BULK_INSERT_CHUNK) {
      const chunk = rows.slice(i, i + BULK_INSERT_CHUNK);
      const { error: insErr } = await secret
        .from("student_my_application_tasks")
        .insert(chunk);

      if (insErr) {
        console.error("[createSchoolStudentTask] bulk", insErr);
        return { data: null, error: "Could not create the tasks." };
      }
    }

    return { data: { created: studentIds.length }, error: null };
  }

  if (!UUID_RE.test(studentId)) {
    return { data: null, error: "Pick a student." };
  }

  const okStudent =
    auth.kind === "school_admin"
      ? await assertStudentInSchool(secret, studentId, auth.schoolId)
      : await assertStudentExists(secret, studentId);
  if (!okStudent) {
    return {
      data: null,
      error:
        auth.kind === "school_admin"
          ? "That student is not at your school."
          : "That student was not found.",
    };
  }

  const { error: insErr } = await secret
    .from("student_my_application_tasks")
    .insert({
      student_id: studentId,
      title,
      notes,
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

const BULK_MAX_STUDENTS = 50;

export async function bulkCreateSchoolStudentTasks(
  _prev: GeneralResponse<{ created: number } | null> | null,
  formData: FormData,
): Promise<GeneralResponse<{ created: number } | null>> {
  const auth = await requireSchoolAdminSchoolId();
  if ("error" in auth) {
    return { data: null, error: auth.error };
  }

  let studentIds: string[] = [];
  try {
    const raw = String(formData.get("student_ids") ?? "").trim();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return { data: null, error: "Invalid student list." };
    }
    studentIds = parsed.map((x) => String(x ?? "").trim()).filter(Boolean);
  } catch {
    return { data: null, error: "Invalid student list." };
  }

  const unique = [...new Set(studentIds)];
  if (unique.length === 0) {
    return { data: null, error: "Select at least one student." };
  }
  if (unique.length > BULK_MAX_STUDENTS) {
    return {
      data: null,
      error: `You can assign to at most ${BULK_MAX_STUDENTS} students at once.`,
    };
  }

  for (const id of unique) {
    if (!UUID_RE.test(id)) {
      return { data: null, error: "Invalid student selection." };
    }
  }

  const title = String(formData.get("title") ?? "").trim();
  const notesRaw = String(formData.get("notes") ?? "").trim();
  const dueRaw = String(formData.get("due_date") ?? "").trim();
  const priority = normalizePriority(String(formData.get("priority") ?? ""));

  if (!title) {
    return { data: null, error: "Describe the task." };
  }
  if (!dueRaw || !/^\d{4}-\d{2}-\d{2}$/.test(dueRaw)) {
    return { data: null, error: "Pick a valid due date." };
  }
  if (notesRaw.length > 4000) {
    return {
      data: null,
      error: "Notes must be at most 4000 characters.",
    };
  }

  const secret = await createSupabaseSecretClient();

  const { data: allowedRows, error: qErr } = await secret
    .from("student_profiles")
    .select("id")
    .eq("school_id", auth.schoolId)
    .in("id", unique);

  if (qErr) {
    console.error("[bulkCreateSchoolStudentTasks] list", qErr);
    return { data: null, error: "Could not verify students." };
  }

  const allowed = new Set((allowedRows ?? []).map((r) => r.id));
  if (allowed.size !== unique.length) {
    return {
      data: null,
      error: "Some selected students are not at your school.",
    };
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

  const due_date = dueRaw;
  const notes =
    notesRaw.length > 8000
      ? notesRaw.slice(0, 8000)
      : notesRaw || null;

  const rows = unique.map((student_id) => ({
    student_id,
    title,
    notes,
    priority,
    due_date,
    assigned_by_name: assignedBy,
  }));

  const { error: insErr } = await secret
    .from("student_my_application_tasks")
    .insert(rows);

  if (insErr) {
    console.error("[bulkCreateSchoolStudentTasks]", insErr);
    return { data: null, error: "Could not create the tasks." };
  }

  return { data: { created: unique.length }, error: null };
}

export async function toggleSchoolStudentTask(
  taskId: string,
): Promise<{ ok: true } | { error: string }> {
  if (!UUID_RE.test(taskId)) {
    return { error: "Invalid task." };
  }

  const auth = await requireTaskManagerAccess();
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

  const okStudent =
    auth.kind === "school_admin"
      ? await assertStudentInSchool(secret, task.student_id, auth.schoolId)
      : await assertStudentExists(secret, task.student_id);
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
