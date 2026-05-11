import { requireStudentSession } from "@/lib/student-ai-usage-log";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import { redirect } from "next/navigation";
import { getPlatformCompletionStats } from "@/lib/student-platform-completion";
import type {
  DashboardActivityLogItem,
  DashboardAnnouncementItem,
  DashboardTaskItem,
} from "./_data/student-dashboard-data";
import { StudentDashboard } from "./_components/student-dashboard";

export default async function StudentPage() {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  const secret = await createSupabaseSecretClient();

  const [
    { data: recentActivities },
    { data: announcements },
    { data: studentProgress },
    { data: tasksRaw, error: tasksError },
  ] = await Promise.all([
    supabase
      .from("acitivity_logs")
      .select("id, message, entitiy_type, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("announcements")
      .select("id, title, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("student_profiles")
      .select("first_name, last_name, platform_completion, total_logins")
      .eq("id", auth.studentId)
      .single(),
    secret
      .from("student_my_application_tasks")
      .select(
        "id, title, notes, priority, due_date, completed, assigned_by_name, created_at",
      )
      .eq("student_id", auth.studentId)
      .order("completed", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (tasksError) {
    console.error("[StudentPage] student_my_application_tasks", tasksError);
  }

  const platformStats = getPlatformCompletionStats(
    studentProgress?.platform_completion ?? null,
  );
  const welcomeFirstName = studentProgress?.first_name?.trim() ?? "";

  const announcementItems: DashboardAnnouncementItem[] = (announcements ?? [])
    .map((row) => ({
      id: row.id,
      title: row.title?.trim() ?? "",
      createdAt: row.created_at ?? null,
    }))
    .filter((row) => row.title.length > 0);

  const activityLogItems: DashboardActivityLogItem[] = (recentActivities ?? []).map((row) => ({
    id: row.id,
    message: row.message?.trim() || "—",
    entityType: (row.entitiy_type ?? "").trim().toLowerCase(),
    createdAt: row.created_at ?? null,
  }));

  const dashboardTasks: DashboardTaskItem[] = (tasksRaw ?? []).map((row) => ({
    id: row.id,
    title: row.title?.trim() || "Task",
    notes: row.notes?.trim() ?? null,
    dueDate: row.due_date ?? null,
    priority: (row.priority ?? "medium").toLowerCase(),
    completed: Boolean(row.completed),
    assignedByName: row.assigned_by_name?.trim() ?? null,
    createdAt: row.created_at ?? "",
  }));

  return (
    <StudentDashboard
      welcomeFirstName={welcomeFirstName}
      platformCompleted={platformStats.completed}
      platformTotal={platformStats.total}
      platformPercent={platformStats.percent}
      totalLogins={studentProgress?.total_logins ?? 0}
      announcementItems={announcementItems}
      activityLogItems={activityLogItems}
      dashboardTasks={dashboardTasks}
    />
  );
}