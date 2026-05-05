import { createSupabaseServerClient } from "@/utils/supabase-server";
import { getPlatformCompletionStats } from "@/lib/student-platform-completion";
import type {
  DashboardActivityLogItem,
  DashboardAnnouncementItem,
} from "./_data/student-dashboard-data";
import { StudentDashboard } from "./_components/student-dashboard";

export default async function StudentPage() {

  const supabase = await createSupabaseServerClient();

  const { data: recentActivities } = await supabase
    .from("acitivity_logs")
    .select("id, message, entitiy_type, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: studentProgress } = await supabase
    .from("student_profiles")
    .select("first_name, last_name, platform_completion, total_logins")
    .single();

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

  return (
    <StudentDashboard
      welcomeFirstName={welcomeFirstName}
      platformCompleted={platformStats.completed}
      platformTotal={platformStats.total}
      platformPercent={platformStats.percent}
      totalLogins={studentProgress?.total_logins ?? 0}
      announcementItems={announcementItems}
      activityLogItems={activityLogItems}
    />
  );
}