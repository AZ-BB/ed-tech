import { createSupabaseServerClient } from "@/utils/supabase-server";
import { getPlatformCompletionStats } from "@/lib/student-platform-completion";
import type {
  DashboardActivityLogItem,
  DashboardAnnouncementItem,
  StudentDashboardActivityCounts,
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
    .select("first_name, last_name, platform_completion")
    .single();

  const platformStats = getPlatformCompletionStats(
    studentProgress?.platform_completion ?? null,
  );
  const welcomeFirstName = studentProgress?.first_name?.trim() ?? "";

  const [
    { count: savedUniversitiesCount },
    { count: viewedUniversitiesCount },
    { count: savedScholarshipsCount },
    { count: essaysReviewedCount },
    { count: aiMatchesGeneratedCount },
    { count: advisorSessionsBookedCount },
    { count: ambassadorSessionsBookedCount },
  ] = await Promise.all([
    supabase
      .from("student_activities")
      .select("id", { count: "exact" })
      .eq("entity_type", "university")
      .eq("type", "save"),
    supabase
      .from("student_activities")
      .select("id", { count: "exact" })
      .eq("entity_type", "university")
      .eq("type", "viewed"),
    supabase
      .from("student_activities")
      .select("id", { count: "exact" })
      .eq("entity_type", "scholarship")
      .eq("type", "save"),
    supabase
      .from("ai_usage")
      .select("id", { count: "exact" })
      .eq("type", "essay_review"),
    supabase
      .from("ai_usage")
      .select("id", { count: "exact" })
      .eq("type", "matching"),
    supabase.from("advisor_sessions").select("id", { count: "exact" }),
    supabase
      .from("ambassador_session_requests")
      .select("id", { count: "exact" }),
  ]);

  const activityCounts: StudentDashboardActivityCounts = {
    universities_viewed: viewedUniversitiesCount ?? 0,
    universities_saved: savedUniversitiesCount ?? 0,
    scholarships_saved: savedScholarshipsCount ?? 0,
    essays_reviewed: essaysReviewedCount ?? 0,
    advisor_sessions_booked: advisorSessionsBookedCount ?? 0,
    ambassador_sessions_booked: ambassadorSessionsBookedCount ?? 0,
    total_logins: 0,
    ai_matches_generated: aiMatchesGeneratedCount ?? 0,
  };

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
      activityCounts={activityCounts}
      announcementItems={announcementItems}
      activityLogItems={activityLogItems}
    />
  );
}