import type { SchoolTaskTableRow } from "@/app/(protected)/school/tasks/_lib/fetch-school-tasks-page";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

type TaskQueryRow = {
  id: string;
  student_id: string;
  title: string;
  notes: string | null;
  priority: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  assigned_by_name: string | null;
  student_profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
};

export async function fetchAdminStudentTasksPage(
  studentId: string,
  filters: { page: number; limit: number },
): Promise<{ rows: SchoolTaskTableRow[]; totalRows: number }> {
  const secret = await createSupabaseSecretClient();
  const page = Math.max(1, filters.page);
  const limit = Math.min(50, Math.max(5, filters.limit));
  const offset = (page - 1) * limit;

  const { data, error, count } = await secret
    .from("student_my_application_tasks")
    .select(
      `
      id,
      student_id,
      title,
      notes,
      priority,
      due_date,
      completed,
      completed_at,
      assigned_by_name,
      student_profiles!inner (
        first_name,
        last_name,
        email,
        avatar_url
      )
    `,
      { count: "exact" },
    )
    .eq("student_id", studentId)
    .order("completed", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[fetchAdminStudentTasksPage]", error);
    return { rows: [], totalRows: 0 };
  }

  const rows: SchoolTaskTableRow[] = (data ?? []).map((raw) => {
    const t = raw as unknown as TaskQueryRow;
    const sp = t.student_profiles;
    return {
      taskId: t.id,
      studentId: t.student_id,
      firstName: sp?.first_name?.trim() ?? "",
      lastName: sp?.last_name?.trim() ?? "",
      avatarUrl: sp?.avatar_url?.trim() || null,
      email: sp?.email?.trim() ?? "",
      title: t.title,
      notes: t.notes,
      priority: t.priority ?? "",
      dueDate: t.due_date,
      completed: t.completed,
      completedAt: t.completed_at,
      assignedByName: t.assigned_by_name,
    };
  });

  return { rows, totalRows: count ?? 0 };
}
