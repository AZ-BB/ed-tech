import type { Database } from "@/database.types";
import {
  ambassadorInitials,
  buildAmbassadorByline,
} from "@/lib/student-story-byline";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type StudentStoryLanguage = Database["public"]["Enums"]["student_story_language"];

export type StudentStoryTopic = {
  id: number;
  name: string;
  gradientCss: string;
};

export type StudentStoryCard = {
  id: number;
  title: string;
  description: string;
  topicId: number;
  topicName: string;
  gradientCss: string;
  youtubeVideoId: string;
  durationLabel: string | null;
  language: StudentStoryLanguage | null;
  isLead: boolean;
  ambassadorId: string;
  ambassadorFirstName: string;
  ambassadorLastName: string;
  ambassadorAvatarUrl: string | null;
  ambassadorInitials: string;
  bylineMeta: string;
};

const DEFAULT_GRADIENT = "linear-gradient(150deg,#1B4332,#40916C)";

type StoryQueryRow = {
  id: number;
  title: string;
  description: string;
  topic_id: number;
  youtube_video_id: string;
  duration_label: string | null;
  language: StudentStoryLanguage | null;
  is_lead: boolean;
  byline_meta_override: string | null;
  sort_order: number;
  student_story_topics: {
    name: string;
    gradient_css: string | null;
  } | null;
  ambassadors: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    university_name: string | null;
    nationality_country_code: string;
    universities: { name: string } | null;
  } | null;
};

export type StudentStoriesPageData = {
  topics: StudentStoryTopic[];
  stories: StudentStoryCard[];
};

function mapStoryRow(row: StoryQueryRow): StudentStoryCard | null {
  const ambassador = row.ambassadors;
  if (!ambassador) return null;

  const topic = row.student_story_topics;
  const firstName = ambassador.first_name?.trim() || "";
  const lastName = ambassador.last_name?.trim() || "";

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    topicId: row.topic_id,
    topicName: topic?.name ?? "Student story",
    gradientCss: topic?.gradient_css?.trim() || DEFAULT_GRADIENT,
    youtubeVideoId: row.youtube_video_id,
    durationLabel: row.duration_label,
    language: row.language,
    isLead: row.is_lead,
    ambassadorId: ambassador.id,
    ambassadorFirstName: firstName,
    ambassadorLastName: lastName,
    ambassadorAvatarUrl: ambassador.avatar_url,
    ambassadorInitials: ambassadorInitials(firstName, lastName),
    bylineMeta: buildAmbassadorByline(
      {
        universityName: ambassador.university_name,
        joinedUniversityName: ambassador.universities?.name ?? null,
        nationalityCountryCode: ambassador.nationality_country_code,
      },
      row.byline_meta_override,
    ),
  };
}

export async function fetchStudentStoriesPage(): Promise<StudentStoriesPageData> {
  const supabase = await createSupabaseSecretClient();

  const [{ data: topicRows, error: topicsError }, { data: storyRows, error: storiesError }] =
    await Promise.all([
      supabase
        .from("student_story_topics")
        .select("id, name, gradient_css")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
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
          is_lead,
          byline_meta_override,
          sort_order,
          student_story_topics ( name, gradient_css ),
          ambassadors (
            id,
            first_name,
            last_name,
            avatar_url,
            university_name,
            nationality_country_code,
            universities ( name )
          )
        `,
        )
        .eq("is_active", true)
        .order("is_lead", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
    ]);

  if (topicsError) {
    console.error("[fetchStudentStoriesPage] topics", topicsError);
  }

  if (storiesError) {
    console.error("[fetchStudentStoriesPage] stories", storiesError);
  }

  const topics: StudentStoryTopic[] = (topicRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    gradientCss: row.gradient_css?.trim() || DEFAULT_GRADIENT,
  }));

  const stories = (storyRows ?? [])
    .map((row) => mapStoryRow(row as StoryQueryRow))
    .filter((story): story is StudentStoryCard => story !== null);

  return { topics, stories };
}
