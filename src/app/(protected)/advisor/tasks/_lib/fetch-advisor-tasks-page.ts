import { resolveCurrentAdvisorId } from "@/lib/advisor-access";
import {
  fetchAdvisorStudentApplicationGroups,
  type AdvisorStudentApplicationGroup,
  type AdvisorStudentApplicationOption,
} from "@/lib/advisor-student-application-options";
import type { ApplicationTaskPriority } from "@/lib/application-task-constants";
import { mapApplicationTaskRow } from "@/lib/fetch-application-tasks";
import { createSupabaseServerClient } from "@/utils/supabase-server";

type DbClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type AdvisorTaskStatusFilter = "all" | "undone" | "done";

export type AdvisorTaskTableRow = {
  id: string;
  title: string;
  dueDate: string | null;
  priority: ApplicationTaskPriority;
  completed: boolean;
  applicationId: number;
  studentName: string;
  studentInitials: string;
  authorName: string;
  createdAt: string;
};

export type AdvisorTaskApplicationOption = AdvisorStudentApplicationOption;

export type AdvisorTaskStudentOption = AdvisorStudentApplicationGroup;

export type AdvisorTasksPanelProps = {
  rows: AdvisorTaskTableRow[];
  totalRows: number;
  page: number;
  limit: number;
  status: AdvisorTaskStatusFilter;
  statusCounts: Record<AdvisorTaskStatusFilter, number>;
  taskCreateOptions: AdvisorTaskStudentOption[];
};

type TaskListRowRaw = {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
  completed: boolean;
  application_id: number;
  author_name: string;
  created_at: string;
  applications:
    | {
        id: number;
        student_name: string | null;
        student_email: string | null;
        student_profiles:
          | { first_name: string; last_name: string }
          | { first_name: string; last_name: string }[]
          | null;
      }
    | {
        id: number;
        student_name: string | null;
        student_email: string | null;
        student_profiles:
          | { first_name: string; last_name: string }
          | { first_name: string; last_name: string }[]
          | null;
      }[];
};

function paginationRange(page: number, limit: number) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const from = (safePage - 1) * safeLimit;
  return { from, to: from + safeLimit - 1 };
}

function firstEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

function personName(
  first: string | null | undefined,
  last: string | null | undefined,
): string {
  return [first?.trim(), last?.trim()].filter(Boolean).join(" ").trim();
}

function studentInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  const pair = `${a}${b}`.toUpperCase();
  return pair || "?";
}

function mapAdvisorTaskRow(row: TaskListRowRaw): AdvisorTaskTableRow {
  const application = firstEmbed(row.applications);
  const profile = application ? firstEmbed(application.student_profiles) : null;
  const profileName = profile ? personName(profile.first_name, profile.last_name) : "";
  const studentName =
    profileName || application?.student_name?.trim() || "Student";
  const task = mapApplicationTaskRow({
    id: row.id,
    title: row.title,
    due_date: row.due_date,
    priority: row.priority,
    completed: row.completed,
    source_call_id: null,
    author_name: row.author_name,
    author_role: "advisor",
    created_at: row.created_at,
  });

  return {
    id: task.id,
    title: task.title,
    dueDate: task.dueDate,
    priority: task.priority,
    completed: task.completed,
    applicationId: row.application_id,
    studentName,
    studentInitials: studentInitials(studentName),
    authorName: task.authorName,
    createdAt: task.createdAt,
  };
}

export function parseAdvisorTaskStatusFilter(
  raw: string | string[] | undefined,
): AdvisorTaskStatusFilter {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (value === "undone" || value === "done") return value;
  return "all";
}

async function fetchAssignedApplicationIds(
  client: DbClient,
  advisorId: string,
): Promise<number[]> {
  const { data, error } = await client
    .from("applications")
    .select("id")
    .eq("assigned_to", advisorId)
    .eq("status", "active_package");

  if (error) {
    console.error("[fetchAssignedApplicationIds]", error);
    return [];
  }

  return (data ?? []).map((row) => row.id);
}

async function countAdvisorTasks(
  client: DbClient,
  applicationIds: number[],
  status: AdvisorTaskStatusFilter,
): Promise<number> {
  if (applicationIds.length === 0) return 0;

  let query = client
    .from("application_tasks")
    .select("id", { count: "exact", head: true })
    .in("application_id", applicationIds);

  if (status === "undone") {
    query = query.eq("completed", false);
  } else if (status === "done") {
    query = query.eq("completed", true);
  }

  const { count, error } = await query;
  if (error) {
    console.error("[countAdvisorTasks]", error);
    return 0;
  }

  return count ?? 0;
}

async function fetchAdvisorTaskStatusCounts(
  client: DbClient,
  applicationIds: number[],
): Promise<Record<AdvisorTaskStatusFilter, number>> {
  const [all, undone, done] = await Promise.all([
    countAdvisorTasks(client, applicationIds, "all"),
    countAdvisorTasks(client, applicationIds, "undone"),
    countAdvisorTasks(client, applicationIds, "done"),
  ]);

  return { all, undone, done };
}

export async function fetchAdvisorTasksPanel(options: {
  page: number;
  limit: number;
  status: AdvisorTaskStatusFilter;
}): Promise<AdvisorTasksPanelProps | null> {
  const supabase = await createSupabaseServerClient();
  const advisorId = await resolveCurrentAdvisorId(supabase);
  if (!advisorId) return null;

  const [applicationIds, taskCreateOptions] = await Promise.all([
    fetchAssignedApplicationIds(supabase, advisorId),
    fetchAdvisorStudentApplicationGroups(supabase, advisorId, {
      status: "active_package",
    }),
  ]);
  const emptyCounts: Record<AdvisorTaskStatusFilter, number> = {
    all: 0,
    undone: 0,
    done: 0,
  };

  if (applicationIds.length === 0) {
    return {
      rows: [],
      totalRows: 0,
      page: options.page,
      limit: options.limit,
      status: options.status,
      statusCounts: emptyCounts,
      taskCreateOptions,
    };
  }

  const { page, limit, status } = options;
  const { from, to } = paginationRange(page, limit);

  const [statusCounts, listResult] = await Promise.all([
    fetchAdvisorTaskStatusCounts(supabase, applicationIds),
    (async () => {
      let query = supabase
        .from("application_tasks")
        .select(
          `
          id,
          title,
          due_date,
          priority,
          completed,
          application_id,
          author_name,
          created_at,
          applications (
            id,
            student_name,
            student_email,
            student_profiles ( first_name, last_name )
          )
        `,
          { count: "exact" },
        )
        .in("application_id", applicationIds)
        .order("completed", { ascending: true })
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (status === "undone") {
        query = query.eq("completed", false);
      } else if (status === "done") {
        query = query.eq("completed", true);
      }

      return query.range(from, to);
    })(),
  ]);

  const { data, count, error } = await listResult;

  if (error) {
    console.error("[fetchAdvisorTasksPanel]", error);
    return {
      rows: [],
      totalRows: 0,
      page,
      limit,
      status,
      statusCounts,
      taskCreateOptions,
    };
  }

  const rows = ((data ?? []) as unknown as TaskListRowRaw[]).map(mapAdvisorTaskRow);

  return {
    rows,
    totalRows: count ?? 0,
    page,
    limit,
    status,
    statusCounts,
    taskCreateOptions,
  };
}
