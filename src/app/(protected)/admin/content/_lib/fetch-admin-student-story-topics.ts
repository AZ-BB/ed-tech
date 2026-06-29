import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminStudentStoryTopicRow = {
  id: number;
  name: string;
  sortOrder: number;
  gradientCss: string | null;
  isActive: boolean;
  storyCount: number;
};

export async function fetchAdminStudentStoryTopics(): Promise<AdminStudentStoryTopicRow[]> {
  const supabase = await createSupabaseSecretClient();

  const [{ data: topics, error: topicsError }, { data: stories, error: storiesError }] =
    await Promise.all([
      supabase
        .from("student_story_topics")
        .select("id, name, sort_order, gradient_css, is_active")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase.from("student_stories").select("topic_id"),
    ]);

  if (topicsError) {
    console.error("[fetchAdminStudentStoryTopics]", topicsError);
    return [];
  }

  if (storiesError) {
    console.error("[fetchAdminStudentStoryTopics] story counts", storiesError);
  }

  const countByTopic = new Map<number, number>();
  for (const story of stories ?? []) {
    countByTopic.set(story.topic_id, (countByTopic.get(story.topic_id) ?? 0) + 1);
  }

  return (topics ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    gradientCss: row.gradient_css,
    isActive: row.is_active,
    storyCount: countByTopic.get(row.id) ?? 0,
  }));
}
