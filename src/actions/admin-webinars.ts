"use server";

import {
  ADMIN_WEBINARS_HOME,
} from "@/app/(protected)/admin/content/_data/content-tabs-data";
import { fetchAdminAdvisorOptions } from "@/app/(protected)/admin/content/_lib/fetch-admin-webinars-page";
import type { Database } from "@/database.types";
import { sendWebinarMeetingLinks } from "@/lib/send-webinar-emails";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type WebinarStatus = Database["public"]["Enums"]["webinar_status"];

type AdminWebinarActionResult = { ok: true } | { ok: false; error: string };

export type CreateAdminWebinarResult =
  | { ok: true; webinarId: number }
  | { ok: false; error: string };

export type StartWebinarSessionResult =
  | { ok: true; emailsSent: number; emailsSkipped: number; emailErrors: string[] }
  | { ok: false; error: string };

const WEBINAR_STATUSES = new Set<string>([
  "draft",
  "upcoming",
  "live",
  "completed",
  "cancelled",
]);

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
    console.error("[admin-webinars] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return {
      ok: false as const,
      error: "You do not have permission to manage webinars.",
    };
  }

  return { ok: true as const };
}

function parseWebinarId(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function parseAgendaItems(formData: FormData): string[] {
  const items = formData.getAll("agenda_items");
  return items
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

function parseScheduledAt(dateRaw: string, timeRaw: string): string | null {
  const date = dateRaw.trim();
  const time = timeRaw.trim();
  if (!date || !time) return null;

  const combined = `${date}T${time}:00`;
  const parsed = new Date(combined);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function validateScheduledAtInFuture(
  scheduledAt: string,
  existingScheduledAt?: string | null,
): string | null {
  const scheduledMs = new Date(scheduledAt).getTime();
  if (existingScheduledAt) {
    const existingMs = new Date(existingScheduledAt).getTime();
    if (scheduledMs === existingMs) return null;
  }

  if (scheduledMs <= Date.now()) {
    return "Webinar date and time must be in the future.";
  }

  return null;
}

function parseWebinarForm(
  formData: FormData,
  options?: { existingScheduledAt?: string | null },
):
  | {
      ok: true;
      data: {
        title: string;
        description: string | null;
        scheduledAt: string;
        timezoneLabel: string;
        format: string;
        advisorId: string;
        maxStudents: number;
        tags: string[];
        agenda: string[];
        status: WebinarStatus;
      };
    }
  | { ok: false; error: string } {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const scheduledAt = parseScheduledAt(
    String(formData.get("scheduled_date") ?? ""),
    String(formData.get("scheduled_time") ?? ""),
  );
  const timezoneLabel = String(formData.get("timezone_label") ?? "GST").trim() || "GST";
  const format =
    String(formData.get("format") ?? "Live online webinar").trim() ||
    "Live online webinar";
  const advisorId = String(formData.get("advisor_id") ?? "").trim();
  const maxStudentsRaw = Number.parseInt(String(formData.get("max_students") ?? ""), 10);
  const statusRaw = String(formData.get("status") ?? "upcoming").trim();
  const tags = parseTags(String(formData.get("tags") ?? ""));
  const agenda = parseAgendaItems(formData);

  if (!title) {
    return { ok: false, error: "Title is required." };
  }

  if (!scheduledAt) {
    return { ok: false, error: "Valid date and time are required." };
  }

  const futureDateError = validateScheduledAtInFuture(
    scheduledAt,
    options?.existingScheduledAt,
  );
  if (futureDateError) {
    return { ok: false, error: futureDateError };
  }

  if (!UUID_RE.test(advisorId)) {
    return { ok: false, error: "Please select an advisor." };
  }

  if (!Number.isFinite(maxStudentsRaw) || maxStudentsRaw <= 0) {
    return { ok: false, error: "Max students must be a positive number." };
  }

  if (!WEBINAR_STATUSES.has(statusRaw)) {
    return { ok: false, error: "Invalid status." };
  }

  return {
    ok: true,
    data: {
      title,
      description,
      scheduledAt,
      timezoneLabel,
      format,
      advisorId,
      maxStudents: maxStudentsRaw,
      tags,
      agenda,
      status: statusRaw as WebinarStatus,
    },
  };
}

function revalidateWebinarPaths(webinarId?: number) {
  revalidatePath(ADMIN_WEBINARS_HOME);
  revalidatePath("/student/webinars");
  revalidatePath("/school/webinars");
  if (webinarId) {
    revalidatePath(`${ADMIN_WEBINARS_HOME}/${webinarId}`);
  }
}

export async function createAdminWebinar(
  formData: FormData,
): Promise<CreateAdminWebinarResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const parsed = parseWebinarForm(formData);
  if (!parsed.ok) return parsed;

  const secret = await createSupabaseSecretClient();
  const now = new Date().toISOString();

  const { data, error } = await secret
    .from("webinars")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description,
      scheduled_at: parsed.data.scheduledAt,
      timezone_label: parsed.data.timezoneLabel,
      format: parsed.data.format,
      advisor_id: parsed.data.advisorId,
      max_students: parsed.data.maxStudents,
      tags: parsed.data.tags,
      agenda: parsed.data.agenda,
      status: parsed.data.status,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createAdminWebinar]", error);
    return { ok: false, error: "Could not create webinar." };
  }

  revalidateWebinarPaths(data.id);
  return { ok: true, webinarId: data.id };
}

export async function updateAdminWebinar(
  formData: FormData,
): Promise<AdminWebinarActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const id = parseWebinarId(formData.get("id"));
  if (!id) {
    return { ok: false, error: "Invalid webinar." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: existing, error: existingError } = await secret
    .from("webinars")
    .select("scheduled_at")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    console.error("[updateAdminWebinar] fetch existing", existingError);
    return { ok: false, error: "Could not load webinar." };
  }

  if (!existing) {
    return { ok: false, error: "Webinar not found." };
  }

  const parsed = parseWebinarForm(formData, {
    existingScheduledAt: existing.scheduled_at,
  });
  if (!parsed.ok) return parsed;

  const { error } = await secret
    .from("webinars")
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      scheduled_at: parsed.data.scheduledAt,
      timezone_label: parsed.data.timezoneLabel,
      format: parsed.data.format,
      advisor_id: parsed.data.advisorId,
      max_students: parsed.data.maxStudents,
      tags: parsed.data.tags,
      agenda: parsed.data.agenda,
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[updateAdminWebinar]", error);
    return { ok: false, error: "Could not update webinar." };
  }

  revalidateWebinarPaths(id);
  return { ok: true };
}

export async function deleteAdminWebinar(
  webinarId: number,
): Promise<AdminWebinarActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  if (!Number.isFinite(webinarId) || webinarId <= 0) {
    return { ok: false, error: "Invalid webinar." };
  }

  const secret = await createSupabaseSecretClient();
  const { error } = await secret.from("webinars").delete().eq("id", webinarId);

  if (error) {
    console.error("[deleteAdminWebinar]", error);
    return { ok: false, error: "Could not delete webinar." };
  }

  revalidateWebinarPaths();
  return { ok: true };
}

export async function startAdminWebinarSession(
  webinarId: number,
  meetingLink: string,
): Promise<StartWebinarSessionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  if (!Number.isFinite(webinarId) || webinarId <= 0) {
    return { ok: false, error: "Invalid webinar." };
  }

  const trimmedLink = meetingLink.trim();
  if (!trimmedLink) {
    return { ok: false, error: "Meeting link is required." };
  }

  try {
    new URL(trimmedLink);
  } catch {
    return { ok: false, error: "Please enter a valid meeting link URL." };
  }

  const secret = await createSupabaseSecretClient();
  const now = new Date().toISOString();

  const { error: updateErr } = await secret
    .from("webinars")
    .update({
      meeting_link: trimmedLink,
      status: "live",
      updated_at: now,
    })
    .eq("id", webinarId);

  if (updateErr) {
    console.error("[startAdminWebinarSession]", updateErr);
    return { ok: false, error: "Could not start webinar session." };
  }

  const emailResult = await sendWebinarMeetingLinks(webinarId, trimmedLink);

  revalidateWebinarPaths(webinarId);

  return {
    ok: true,
    emailsSent: emailResult.sent,
    emailsSkipped: emailResult.skipped,
    emailErrors: emailResult.errors,
  };
}

export async function getAdminAdvisorOptionsForForm() {
  const access = await assertAdminAccess();
  if (!access.ok) return [];
  return fetchAdminAdvisorOptions();
}
