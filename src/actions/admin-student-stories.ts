"use server";

import { ADMIN_STUDENT_STORIES_HOME } from "@/app/(protected)/admin/content/_data/content-tabs-data";
import type { Database } from "@/database.types";
import { parseYouTubeVideoId } from "@/lib/youtube";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

import { fetchAdminAmbassadorStoryOptions } from "@/app/(protected)/admin/content/_lib/fetch-admin-student-stories-page";

type StudentStoryLanguage = Database["public"]["Enums"]["student_story_language"];

type AdminStudentStoryActionResult = { ok: true } | { ok: false; error: string };

export type CreateAdminStudentStoryResult =
  | { ok: true; storyId: number }
  | { ok: false; error: string };

export type CreateAdminStudentStoryTopicResult =
  | { ok: true; topicId: number }
  | { ok: false; error: string };

const LANGUAGE_VALUES = new Set<string>(["en", "ar", "mixed"]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function assertAdminAccess() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false as const, error: "You must be signed in." };
  }

  const service = await createSupabaseSecretClient();
  const { data: admin, error: adminError } = await service
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("[admin-student-stories] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return {
      ok: false as const,
      error: "You do not have permission to manage student stories.",
    };
  }

  return { ok: true as const };
}

function parsePositiveInt(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseSortOrder(raw: FormDataEntryValue | null): number {
  const value = String(raw ?? "").trim();
  if (!value) return 0;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
}

function parseCheckbox(raw: FormDataEntryValue | null): boolean {
  return String(raw ?? "") === "on" || String(raw ?? "") === "true";
}

function parseLanguage(raw: FormDataEntryValue | null): StudentStoryLanguage | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  if (!LANGUAGE_VALUES.has(value)) return null;
  return value as StudentStoryLanguage;
}

function parseAmbassadorId(raw: FormDataEntryValue | null): string | null {
  const value = String(raw ?? "").trim();
  if (!value || !UUID_RE.test(value)) return null;
  return value;
}

function revalidateStudentStoriesPaths() {
  revalidatePath(ADMIN_STUDENT_STORIES_HOME);
  revalidatePath("/student/student-stories");
}

async function clearOtherLeadStories(
  secret: Awaited<ReturnType<typeof createSupabaseSecretClient>>,
  excludeStoryId?: number,
) {
  let query = secret.from("student_stories").update({ is_lead: false }).eq("is_lead", true);
  if (excludeStoryId != null) {
    query = query.neq("id", excludeStoryId);
  }
  const { error } = await query;
  if (error) {
    console.error("[admin-student-stories] clear lead stories", error);
  }
}

export async function getAdminAmbassadorOptionsForStoryForm() {
  const access = await assertAdminAccess();
  if (!access.ok) return access;
  const ambassadors = await fetchAdminAmbassadorStoryOptions();
  return { ok: true as const, ambassadors };
}

export async function getAdminStudentStoryTopicsForForm() {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const { fetchAdminStudentStoryTopics } = await import(
    "@/app/(protected)/admin/content/_lib/fetch-admin-student-story-topics"
  );
  const topics = await fetchAdminStudentStoryTopics();
  return { ok: true as const, topics };
}

export async function createAdminStudentStoryTopic(
  formData: FormData,
): Promise<CreateAdminStudentStoryTopicResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const name = String(formData.get("name") ?? "").trim();
  const sortOrder = parseSortOrder(formData.get("sort_order"));
  const gradientCss = String(formData.get("gradient_css") ?? "").trim() || null;
  const isActive = parseCheckbox(formData.get("is_active"));

  if (!name) {
    return { ok: false, error: "Topic name is required." };
  }

  const secret = await createSupabaseSecretClient();
  const now = new Date().toISOString();

  const { data, error } = await secret
    .from("student_story_topics")
    .insert({
      name,
      sort_order: sortOrder,
      gradient_css: gradientCss,
      is_active: isActive,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createAdminStudentStoryTopic]", error);
    if (error?.code === "23505") {
      return { ok: false, error: "A topic with this name already exists." };
    }
    return { ok: false, error: "Could not create topic." };
  }

  revalidateStudentStoriesPaths();
  return { ok: true, topicId: data.id };
}

export async function updateAdminStudentStoryTopic(
  formData: FormData,
): Promise<AdminStudentStoryActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const id = parsePositiveInt(formData.get("id"));
  if (!id) {
    return { ok: false, error: "Invalid topic." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const sortOrder = parseSortOrder(formData.get("sort_order"));
  const gradientCss = String(formData.get("gradient_css") ?? "").trim() || null;
  const isActive = parseCheckbox(formData.get("is_active"));

  if (!name) {
    return { ok: false, error: "Topic name is required." };
  }

  const secret = await createSupabaseSecretClient();
  const { error } = await secret
    .from("student_story_topics")
    .update({
      name,
      sort_order: sortOrder,
      gradient_css: gradientCss,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[updateAdminStudentStoryTopic]", error);
    if (error.code === "23505") {
      return { ok: false, error: "A topic with this name already exists." };
    }
    return { ok: false, error: "Could not update topic." };
  }

  revalidateStudentStoriesPaths();
  return { ok: true };
}

export async function deleteAdminStudentStoryTopic(
  topicId: number,
): Promise<AdminStudentStoryActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  if (!Number.isFinite(topicId) || topicId <= 0) {
    return { ok: false, error: "Invalid topic." };
  }

  const secret = await createSupabaseSecretClient();

  const { count, error: countError } = await secret
    .from("student_stories")
    .select("id", { count: "exact", head: true })
    .eq("topic_id", topicId);

  if (countError) {
    console.error("[deleteAdminStudentStoryTopic] count", countError);
    return { ok: false, error: "Could not verify topic usage." };
  }

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: "This topic has stories assigned. Reassign or delete them first.",
    };
  }

  const { error } = await secret.from("student_story_topics").delete().eq("id", topicId);

  if (error) {
    console.error("[deleteAdminStudentStoryTopic]", error);
    return { ok: false, error: "Could not delete topic." };
  }

  revalidateStudentStoriesPaths();
  return { ok: true };
}

export async function createAdminStudentStory(
  formData: FormData,
): Promise<CreateAdminStudentStoryResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const topicId = parsePositiveInt(formData.get("topic_id"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const youtubeRaw = String(formData.get("youtube_url") ?? "").trim();
  const youtubeVideoId = parseYouTubeVideoId(youtubeRaw);
  const durationLabel = String(formData.get("duration_label") ?? "").trim() || null;
  const language = parseLanguage(formData.get("language"));
  const ambassadorId = parseAmbassadorId(formData.get("ambassador_id"));
  const bylineMetaOverride = String(formData.get("byline_meta_override") ?? "").trim() || null;
  const isLead = parseCheckbox(formData.get("is_lead"));
  const isActive = parseCheckbox(formData.get("is_active"));
  const sortOrder = parseSortOrder(formData.get("sort_order"));

  if (!topicId) {
    return { ok: false, error: "Select a topic." };
  }
  if (!title) {
    return { ok: false, error: "Title is required." };
  }
  if (!description) {
    return { ok: false, error: "Description is required." };
  }
  if (!youtubeVideoId) {
    return { ok: false, error: "Enter a valid YouTube URL or video ID." };
  }
  if (!ambassadorId) {
    return { ok: false, error: "Select an ambassador." };
  }

  const secret = await createSupabaseSecretClient();
  const now = new Date().toISOString();

  if (isLead) {
    await clearOtherLeadStories(secret);
  }

  const { data, error } = await secret
    .from("student_stories")
    .insert({
      topic_id: topicId,
      title,
      description,
      youtube_video_id: youtubeVideoId,
      duration_label: durationLabel,
      language,
      ambassador_id: ambassadorId,
      byline_meta_override: bylineMetaOverride,
      is_lead: isLead,
      is_active: isActive,
      sort_order: sortOrder,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createAdminStudentStory]", error);
    return { ok: false, error: "Could not create story." };
  }

  revalidateStudentStoriesPaths();
  return { ok: true, storyId: data.id };
}

export async function updateAdminStudentStory(
  formData: FormData,
): Promise<AdminStudentStoryActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const id = parsePositiveInt(formData.get("id"));
  if (!id) {
    return { ok: false, error: "Invalid story." };
  }

  const topicId = parsePositiveInt(formData.get("topic_id"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const youtubeRaw = String(formData.get("youtube_url") ?? "").trim();
  const youtubeVideoId = parseYouTubeVideoId(youtubeRaw);
  const durationLabel = String(formData.get("duration_label") ?? "").trim() || null;
  const language = parseLanguage(formData.get("language"));
  const ambassadorId = parseAmbassadorId(formData.get("ambassador_id"));
  const bylineMetaOverride = String(formData.get("byline_meta_override") ?? "").trim() || null;
  const isLead = parseCheckbox(formData.get("is_lead"));
  const isActive = parseCheckbox(formData.get("is_active"));
  const sortOrder = parseSortOrder(formData.get("sort_order"));

  if (!topicId) {
    return { ok: false, error: "Select a topic." };
  }
  if (!title) {
    return { ok: false, error: "Title is required." };
  }
  if (!description) {
    return { ok: false, error: "Description is required." };
  }
  if (!youtubeVideoId) {
    return { ok: false, error: "Enter a valid YouTube URL or video ID." };
  }
  if (!ambassadorId) {
    return { ok: false, error: "Select an ambassador." };
  }

  const secret = await createSupabaseSecretClient();

  if (isLead) {
    await clearOtherLeadStories(secret, id);
  }

  const { error } = await secret
    .from("student_stories")
    .update({
      topic_id: topicId,
      title,
      description,
      youtube_video_id: youtubeVideoId,
      duration_label: durationLabel,
      language,
      ambassador_id: ambassadorId,
      byline_meta_override: bylineMetaOverride,
      is_lead: isLead,
      is_active: isActive,
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[updateAdminStudentStory]", error);
    return { ok: false, error: "Could not update story." };
  }

  revalidateStudentStoriesPaths();
  return { ok: true };
}

export async function deleteAdminStudentStory(
  storyId: number,
): Promise<AdminStudentStoryActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  if (!Number.isFinite(storyId) || storyId <= 0) {
    return { ok: false, error: "Invalid story." };
  }

  const secret = await createSupabaseSecretClient();
  const { error } = await secret.from("student_stories").delete().eq("id", storyId);

  if (error) {
    console.error("[deleteAdminStudentStory]", error);
    return { ok: false, error: "Could not delete story." };
  }

  revalidateStudentStoriesPaths();
  return { ok: true };
}
