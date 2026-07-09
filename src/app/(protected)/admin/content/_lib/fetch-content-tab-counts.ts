import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { ContentTabCounts } from "../_data/content-tabs-data";

async function countTable(
  table:
    | "universities"
    | "scholarships"
    | "internships"
    | "programs_discovery"
    | "university_programs"
    | "announcements"
    | "news_items"
    | "webinars"
    | "student_stories",
) {
  const supabase = await createSupabaseSecretClient();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error(`[admin-content] count ${table}`, error);
    return 0;
  }

  return count ?? 0;
}

export async function fetchContentTabCounts(): Promise<ContentTabCounts> {
  const [
    universities,
    scholarships,
    internships,
    programsDiscovery,
    universityPrograms,
    announcements,
    news,
    webinars,
    studentStories,
  ] = await Promise.all([
    countTable("universities"),
    countTable("scholarships"),
    countTable("internships"),
    countTable("programs_discovery"),
    countTable("university_programs"),
    countTable("announcements"),
    countTable("news_items"),
    countTable("webinars"),
    countTable("student_stories"),
  ]);

  return {
    universities,
    scholarships,
    internships,
    "programs-discovery": programsDiscovery,
    "university-programs": universityPrograms,
    announcements,
    news,
    webinars,
    "student-stories": studentStories,
  };
}
