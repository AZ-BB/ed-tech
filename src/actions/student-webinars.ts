"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";

type RegisterWebinarResult = { ok: true } | { ok: false; error: string };

async function requireStudentActor(): Promise<{ studentId: string } | { error: string }> {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await authClient.auth.getUser();
  if (authErr || !user) {
    return { error: "You must be signed in." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: profile, error } = await secret
    .from("student_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    console.error(error);
    return { error: "Could not verify your student profile." };
  }
  if (!profile) {
    return { error: "Student profile not found." };
  }
  return { studentId: user.id };
}

export async function registerForWebinar(
  webinarId: number,
): Promise<RegisterWebinarResult> {
  const actor = await requireStudentActor();
  if ("error" in actor) {
    return { ok: false, error: actor.error };
  }

  if (!Number.isFinite(webinarId) || webinarId <= 0) {
    return { ok: false, error: "Invalid webinar." };
  }

  const secret = await createSupabaseSecretClient();

  const { data: webinar, error: webinarErr } = await secret
    .from("webinars")
    .select("id, status, max_students, scheduled_at")
    .eq("id", webinarId)
    .maybeSingle();

  if (webinarErr || !webinar) {
    return { ok: false, error: "Webinar not found." };
  }

  if (webinar.status !== "upcoming") {
    return { ok: false, error: "This webinar is not open for registration." };
  }

  if (new Date(webinar.scheduled_at).getTime() <= Date.now()) {
    return { ok: false, error: "This webinar has already started." };
  }

  const { count, error: countErr } = await secret
    .from("webinar_registrations")
    .select("id", { count: "exact", head: true })
    .eq("webinar_id", webinarId);

  if (countErr) {
    console.error("[registerForWebinar] count", countErr);
    return { ok: false, error: "Could not verify capacity." };
  }

  if ((count ?? 0) >= webinar.max_students) {
    return { ok: false, error: "This webinar is full." };
  }

  const { data: existing, error: existingErr } = await secret
    .from("webinar_registrations")
    .select("id")
    .eq("webinar_id", webinarId)
    .eq("student_id", actor.studentId)
    .maybeSingle();

  if (existingErr) {
    console.error("[registerForWebinar] existing", existingErr);
    return { ok: false, error: "Could not verify registration." };
  }

  if (existing) {
    return { ok: false, error: "You are already registered for this webinar." };
  }

  const { error: insertErr } = await secret.from("webinar_registrations").insert({
    webinar_id: webinarId,
    student_id: actor.studentId,
  });

  if (insertErr) {
    console.error("[registerForWebinar] insert", insertErr);
    return { ok: false, error: "Could not complete registration." };
  }

  revalidatePath("/student/webinars");
  return { ok: true };
}
