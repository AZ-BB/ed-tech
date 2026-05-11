import { addDays, format, startOfDay } from "date-fns";

import { createSupabaseServerClient } from "@/utils/supabase-server";

export type SchoolTaskTableRow = {
  taskId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  description: string | null;
  priority: string;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  assignedByName: string | null;
};

export type SchoolStudentPickerOption = {
  id: string;
  label: string;
};

export type SchoolTasksPageFilters = {
  q: string;
  /** "", "overdue", "week" */
  when: string;
  /** "", "high", "medium", "low" */
  priority: string;
  /** "", "open", "complete" */
  status: string;
  page: number;
  limit: number;
  /** When set, only tasks for this student (must belong to admin's school). */
  studentId?: string;
};

function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function normalizePriority(raw: string): "" | "high" | "medium" | "low" {
  const x = raw.toLowerCase();
  if (x === "high" || x === "medium" || x === "low") return x;
  return "";
}

function normalizeWhen(raw: string): "" | "overdue" | "week" {
  if (raw === "overdue" || raw === "week") return raw;
  return "";
}

function normalizeTaskStatus(raw: string): "" | "open" | "complete" {
  if (raw === "open" || raw === "complete") return raw;
  return "";
}

type TaskQueryRow = {
  id: string;
  student_id: string;
  title: string;
  description: string | null;
  priority: string;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  assigned_by_name: string | null;
  student_profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
};

export async function fetchSchoolStudentPickerOptions(): Promise<
  SchoolStudentPickerOption[]
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return [];

  const { data: sap } = await supabase
    .from("school_admin_profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  const schoolId = sap?.school_id;
  if (!schoolId) return [];

  const { data: rows, error } = await supabase
    .from("student_profiles")
    .select("id, first_name, last_name, email")
    .eq("school_id", schoolId)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error || !rows) {
    if (error) console.error(error);
    return [];
  }

  return rows.map((r) => {
    const name =
      `${r.first_name?.trim() ?? ""} ${r.last_name?.trim() ?? ""}`.trim();
    const email = r.email?.trim() ?? "";
    let label: string;
    if (name && email) {
      label = `${name} (${email})`;
    } else if (email) {
      label = email;
    } else {
      label = name || r.id;
    }
    return { id: r.id, label };
  });
}

export async function fetchSchoolTasksPage(
  filters: SchoolTasksPageFilters,
): Promise<{
  rows: SchoolTaskTableRow[];
  totalRows: number;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { rows: [], totalRows: 0 };
  }

  const { data: sap } = await supabase
    .from("school_admin_profiles")
    .select("school_id")
    .eq("id", user.id)
    .maybeSingle();

  const schoolId = sap?.school_id;
  if (!schoolId) {
    return { rows: [], totalRows: 0 };
  }

  const page = Math.max(1, filters.page);
  const limit = Math.min(50, Math.max(5, filters.limit));
  const offset = (page - 1) * limit;

  const qTrim = filters.q.trim();
  const when = normalizeWhen(filters.when);
  const priority = normalizePriority(filters.priority);
  const taskStatus = normalizeTaskStatus(filters.status);

  const today = format(startOfDay(new Date()), "yyyy-MM-dd");
  const weekEnd = format(addDays(startOfDay(new Date()), 7), "yyyy-MM-dd");

  let q = supabase
    .from("student_my_application_tasks")
    .select(
      `
      id,
      student_id,
      title,
      description,
      priority,
      due_date,
      completed,
      completed_at,
      assigned_by_name,
      student_profiles!inner (
        first_name,
        last_name,
        email,
        school_id
      )
    `,
      { count: "exact" },
    )
    .eq("student_profiles.school_id", schoolId);

  if (filters.studentId?.trim()) {
    q = q.eq("student_id", filters.studentId.trim());
  }

  if (qTrim) {
    const e = escapeIlike(qTrim);
    const p = `%${e}%`;
    q = q.or(
      `title.ilike.${p},description.ilike.${p},student_profiles.first_name.ilike.${p},student_profiles.last_name.ilike.${p},student_profiles.email.ilike.${p}`,
    );
  }

  if (priority) {
    q = q.eq("priority", priority);
  }

  if (taskStatus === "complete") {
    q = q.eq("completed", true);
  } else if (taskStatus === "open") {
    q = q.eq("completed", false);
  }

  if (when === "overdue") {
    q = q
      .eq("completed", false)
      .not("due_date", "is", null)
      .lt("due_date", today);
  } else if (when === "week") {
    q = q
      .eq("completed", false)
      .not("due_date", "is", null)
      .gte("due_date", today)
      .lte("due_date", weekEnd);
  }

  q = q
    .order("completed", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await q;

  if (error) {
    console.error("[fetchSchoolTasksPage]", error);
    return { rows: [], totalRows: 0 };
  }

  const totalRows = count ?? 0;

  const rows: SchoolTaskTableRow[] = (data ?? []).map((raw) => {
    const t = raw as unknown as TaskQueryRow;
    const sp = t.student_profiles;
    return {
      taskId: t.id,
      studentId: t.student_id,
      firstName: sp?.first_name?.trim() ?? "",
      lastName: sp?.last_name?.trim() ?? "",
      email: sp?.email?.trim() ?? "",
      title: t.title,
      description: t.description,
      priority: t.priority,
      dueDate: t.due_date,
      completed: t.completed,
      completedAt: t.completed_at,
      assignedByName: t.assigned_by_name,
    };
  });

  return { rows, totalRows };
}
