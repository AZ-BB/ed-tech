import type { ApplicationTaskPriority } from "@/lib/application-task-constants";
import type { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";

type DbClient =
  | Awaited<ReturnType<typeof createSupabaseServerClient>>
  | Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type ApplicationTaskRow = {
  id: string;
  title: string;
  dueDate: string | null;
  priority: ApplicationTaskPriority;
  completed: boolean;
  sourceCallId: string | null;
  authorName: string;
  authorRole: "admin" | "advisor";
  createdAt: string;
};

type TaskRowRaw = {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
  completed: boolean;
  source_call_id: string | null;
  author_name: string;
  author_role: string;
  created_at: string;
};

export function mapApplicationTaskRow(row: TaskRowRaw): ApplicationTaskRow {
  return {
    id: row.id,
    title: row.title.trim(),
    dueDate: row.due_date,
    priority: row.priority as ApplicationTaskPriority,
    completed: row.completed,
    sourceCallId: row.source_call_id,
    authorName: row.author_name.trim() || "Staff",
    authorRole: row.author_role === "advisor" ? "advisor" : "admin",
    createdAt: row.created_at,
  };
}

export async function fetchApplicationTasks(
  client: DbClient,
  applicationId: number,
): Promise<ApplicationTaskRow[]> {
  const { data, error } = await client
    .from("application_tasks")
    .select(
      "id, title, due_date, priority, completed, source_call_id, author_name, author_role, created_at",
    )
    .eq("application_id", applicationId)
    .order("completed", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchApplicationTasks]", error);
    return [];
  }

  return (data ?? []).map((row) => mapApplicationTaskRow(row as TaskRowRaw));
}
