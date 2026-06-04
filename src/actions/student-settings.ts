"use server";

import { revalidatePath } from "next/cache";

import { STUDENT_SCHOOL_GRADE_OPTIONS } from "@/lib/school-portal-destination-options";
import { requireStudentSession } from "@/lib/student-ai-usage-log";
import {
  isAllowedImageFile,
  publicStorageObjectUrl,
  resolveContentType,
  sanitizeFilename,
} from "@/lib/storage-utils";
import type { GeneralResponse } from "@/utils/response";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

const STUDENT_AVATARS_BUCKET = "student-avatars";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

async function uploadStudentAvatar(
  service: Awaited<ReturnType<typeof createSupabaseSecretClient>>,
  studentId: string,
  file: File,
): Promise<string> {
  if (!isAllowedImageFile(file)) {
    throw new Error("Profile photo must be a PNG, JPEG, WebP, or GIF image.");
  }

  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error("Profile photo must be 5 MB or smaller.");
  }

  const safeName = sanitizeFilename(file.name);
  const path = `${studentId}/${Date.now()}_${safeName}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const contentType = resolveContentType(file);

  const { error } = await service.storage.from(STUDENT_AVATARS_BUCKET).upload(path, buf, {
    contentType,
    upsert: true,
  });

  if (error) throw error;

  return publicStorageObjectUrl(STUDENT_AVATARS_BUCKET, path);
}

const GRADE_ALLOWED = new Set<string>(STUDENT_SCHOOL_GRADE_OPTIONS);

function splitFullName(full: string): { first_name: string; last_name: string } {
  const t = full.trim();
  if (!t) {
    return { first_name: "", last_name: "" };
  }
  const i = t.search(/\s/);
  if (i === -1) {
    return { first_name: t, last_name: "-" };
  }
  const first = t.slice(0, i).trim();
  const last = t.slice(i + 1).trim() || "-";
  return { first_name: first, last_name: last };
}

export async function updateStudentPersonalAction(
  _prev: GeneralResponse<null> | null,
  formData: FormData,
): Promise<GeneralResponse<null>> {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    return { data: null, error: "Unauthorized." };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) {
    return { data: null, error: "Enter your full name." };
  }

  const { first_name, last_name } = splitFullName(fullName);
  if (!first_name) {
    return { data: null, error: "Enter your full name." };
  }

  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const phone = phoneRaw.length > 0 ? phoneRaw.slice(0, 64) : null;

  const nationalityCountryCode = String(
    formData.get("nationality_country_code") ?? "",
  ).trim();
  if (!nationalityCountryCode) {
    return { data: null, error: "Select your nationality." };
  }

  const grade = String(formData.get("grade") ?? "").trim();
  if (!grade || !GRADE_ALLOWED.has(grade)) {
    return { data: null, error: "Select a valid grade." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: countryOk, error: countryErr } = await supabase
    .from("countries")
    .select("id")
    .eq("id", nationalityCountryCode)
    .maybeSingle();

  if (countryErr || !countryOk) {
    return { data: null, error: "Pick a valid country." };
  }

  const avatarFile = formData.get("avatar");
  const removeAvatar =
    formData.get("remove_avatar") === "1" || formData.get("remove_avatar") === "true";
  const now = new Date().toISOString();

  let avatar_url: string | null | undefined;
  if (avatarFile instanceof File && avatarFile.size > 0) {
    try {
      const service = await createSupabaseSecretClient();
      avatar_url = await uploadStudentAvatar(service, auth.studentId, avatarFile);
    } catch (error) {
      console.error("[student-settings] upload avatar", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Could not upload profile photo.",
      };
    }
  } else if (removeAvatar) {
    avatar_url = null;
  }

  const { error } = await supabase
    .from("student_profiles")
    .update({
      first_name,
      last_name,
      phone,
      grade,
      nationality_country_code: nationalityCountryCode,
      ...(avatar_url !== undefined ? { avatar_url } : {}),
      updated_at: now,
    })
    .eq("id", auth.studentId);

  if (error) {
    console.error("[student-settings] update personal", error);
    return { data: null, error: "Could not save your profile." };
  }

  revalidatePath("/student/settings");
  revalidatePath("/student", "layout");
  revalidatePath("/school", "layout");
  revalidatePath("/admin", "layout");
  return { data: null, error: null };
}

export async function updateStudentNotificationPreferencesAction(
  _prev: GeneralResponse<null> | null,
  formData: FormData,
): Promise<GeneralResponse<null>> {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    return { data: null, error: "Unauthorized." };
  }

  const appUpdatesRaw = String(formData.get("notification_app_updates") ?? "");
  const newsPlatformRaw = String(formData.get("notification_news_platform") ?? "");

  const notification_app_updates =
    appUpdatesRaw === "true" || appUpdatesRaw === "on";
  const notification_news_platform =
    newsPlatformRaw === "true" || newsPlatformRaw === "on";

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("student_profiles")
    .update({
      notification_app_updates,
      notification_news_platform,
      updated_at: new Date().toISOString(),
    })
    .eq("id", auth.studentId);

  if (error) {
    console.error("[student-settings] update notifications", error);
    return { data: null, error: "Could not save preferences." };
  }

  revalidatePath("/student/settings");
  return { data: null, error: null };
}
