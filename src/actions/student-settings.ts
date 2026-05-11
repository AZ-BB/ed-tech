"use server";

import { revalidatePath } from "next/cache";

import { requireStudentSession } from "@/lib/student-ai-usage-log";
import type { GeneralResponse } from "@/utils/response";
import { createSupabaseServerClient } from "@/utils/supabase-server";

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

  const supabase = await createSupabaseServerClient();

  const { data: countryOk, error: countryErr } = await supabase
    .from("countries")
    .select("id")
    .eq("id", nationalityCountryCode)
    .maybeSingle();

  if (countryErr || !countryOk) {
    return { data: null, error: "Pick a valid country." };
  }

  const { error } = await supabase
    .from("student_profiles")
    .update({
      first_name,
      last_name,
      phone,
      nationality_country_code: nationalityCountryCode,
      updated_at: new Date().toISOString(),
    })
    .eq("id", auth.studentId);

  if (error) {
    console.error("[student-settings] update personal", error);
    return { data: null, error: "Could not save your profile." };
  }

  revalidatePath("/student/settings");
  revalidatePath("/student", "layout");
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
