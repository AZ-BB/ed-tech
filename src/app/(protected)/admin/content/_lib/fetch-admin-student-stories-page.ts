import type { Database } from "@/database.types";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type StudentStoryLanguage = Database["public"]["Enums"]["student_story_language"];

export type AdminStudentStoryTableRow = {
  id: number;
  title: string;
  description: string;
  topicId: number;
  topicName: string;
  youtubeVideoId: string;
  durationLabel: string | null;
  language: StudentStoryLanguage | null;
  ambassadorId: string;
  ambassadorName: string;
  bylineMetaOverride: string | null;
  isLead: boolean;
  isActive: boolean;
  sortOrder: number;
};

export type AdminAmbassadorStoryOption = {
  id: string;
  name: string;
  universityLabel: string;
};

export async function fetchAdminAmbassadorStoryOptions(): Promise<AdminAmbassadorStoryOption[]> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("ambassadors")
    .select(
      `
      id,
      first_name,
      last_name,
      university_name,
      universities ( name )
    `,
    )
    .eq("is_active", true)
    .order("last_name")
    .order("first_name");

  if (error) {
    console.error("[fetchAdminAmbassadorStoryOptions]", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const uniFromJoin = row.universities?.name?.trim();
    const universityLabel =
      (uniFromJoin && uniFromJoin.length > 0 ? uniFromJoin : row.university_name?.trim()) ||
      "University TBD";
    const name =
      [row.first_name?.trim(), row.last_name?.trim()].filter(Boolean).join(" ") || "Ambassador";

    return {
      id: row.id,
      name,
      universityLabel,
    };
  });
}

export async function fetchAdminStudentStoriesPage(): Promise<AdminStudentStoryTableRow[]> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("student_stories")
    .select(
      `
      id,
      title,
      description,
      topic_id,
      youtube_video_id,
      duration_label,
      language,
      ambassador_id,
      byline_meta_override,
      is_lead,
      is_active,
      sort_order,
      student_story_topics ( name ),
      ambassadors ( first_name, last_name )
    `,
    )
    .order("is_lead", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchAdminStudentStoriesPage]", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const ambassador = row.ambassadors;
    const ambassadorName =
      ambassador &&
      [ambassador.first_name?.trim(), ambassador.last_name?.trim()].filter(Boolean).join(" ");

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      topicId: row.topic_id,
      topicName: row.student_story_topics?.name ?? "—",
      youtubeVideoId: row.youtube_video_id,
      durationLabel: row.duration_label,
      language: row.language,
      ambassadorId: row.ambassador_id,
      ambassadorName: ambassadorName || "Ambassador",
      bylineMetaOverride: row.byline_meta_override,
      isLead: row.is_lead,
      isActive: row.is_active,
      sortOrder: row.sort_order,
    };
  });
}
