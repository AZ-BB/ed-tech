"use server";

import {
  ADMIN_WEBINARS_HOME,
} from "@/app/(protected)/admin/content/_data/content-tabs-data";
import { fetchAdminAdvisorOptions } from "@/app/(protected)/admin/content/_lib/fetch-admin-webinars-page";
import { fetchAdminWebinarAttendeesExport } from "@/app/(protected)/admin/content/_lib/fetch-admin-webinar-attendees-export";
import type { AdminWebinarAttendeeExportRow } from "@/app/(protected)/admin/content/_lib/fetch-admin-webinar-attendees-export";
import type { Database } from "@/database.types";
import { sendWebinarMeetingLinks } from "@/lib/send-webinar-emails";
import { uploadWebinarHostImage } from "@/lib/webinar-host-image-upload";
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

const ACTIVE_WEBINAR_STATUSES = new Set<WebinarStatus>(["upcoming", "live"]);

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

function parseOptionalMeetingLink(
  raw: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, value: null };
  }

  try {
    new URL(trimmed);
    return { ok: true, value: trimmed };
  } catch {
    return { ok: false, error: "Please enter a valid meeting link URL." };
  }
}

function parseHostImageFile(formData: FormData): File | null {
  const file = formData.get("host_image");
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }
  return file;
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
        advisorId: string | null;
        hostName: string | null;
        hostTitle: string | null;
        hostBio: string | null;
        hostImageUrl: string | null;
        removeHostImage: boolean;
        hostImageFile: File | null;
        maxStudents: number;
        tags: string[];
        agenda: string[];
        status: WebinarStatus;
        meetingLink: string | null;
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
  const hostMode = String(formData.get("host_mode") ?? "advisor").trim();
  const advisorIdRaw = String(formData.get("advisor_id") ?? "").trim();
  const hostNameRaw = String(formData.get("host_name") ?? "").trim();
  const hostTitle = String(formData.get("host_title") ?? "").trim() || null;
  const hostBio = String(formData.get("host_bio") ?? "").trim() || null;
  const existingHostImageUrl =
    String(formData.get("existing_host_image_url") ?? "").trim() || null;
  const removeHostImage = String(formData.get("remove_host_image") ?? "") === "1";
  const hostImageFile = parseHostImageFile(formData);
  const maxStudentsRaw = Number.parseInt(String(formData.get("max_students") ?? ""), 10);
  const statusRaw = String(formData.get("status") ?? "upcoming").trim();
  const tags = parseTags(String(formData.get("tags") ?? ""));
  const agenda = parseAgendaItems(formData);
  const meetingLinkParsed = parseOptionalMeetingLink(
    String(formData.get("meeting_link") ?? ""),
  );

  if (!meetingLinkParsed.ok) {
    return meetingLinkParsed;
  }

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

  let advisorId: string | null = null;
  let hostName: string | null = null;

  if (hostMode === "custom") {
    if (!hostNameRaw) {
      return { ok: false, error: "Host name is required for a custom host." };
    }
    hostName = hostNameRaw;
  } else {
    if (!UUID_RE.test(advisorIdRaw)) {
      return { ok: false, error: "Please select an advisor." };
    }
    advisorId = advisorIdRaw;
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
      hostName,
      hostTitle,
      hostBio,
      hostImageUrl: existingHostImageUrl,
      removeHostImage,
      hostImageFile,
      maxStudents: maxStudentsRaw,
      tags,
      agenda,
      status: statusRaw as WebinarStatus,
      meetingLink: meetingLinkParsed.value,
    },
  };
}

async function resolveHostImageUrl(
  webinarId: number,
  parsed: Extract<Awaited<ReturnType<typeof parseWebinarForm>>, { ok: true }>["data"],
): Promise<string | null> {
  if (parsed.hostImageFile) {
    return uploadWebinarHostImage(webinarId, parsed.hostImageFile);
  }

  if (parsed.removeHostImage) {
    return null;
  }

  return parsed.hostImageUrl;
}

function webinarHostPayload(
  parsed: Extract<Awaited<ReturnType<typeof parseWebinarForm>>, { ok: true }>["data"],
  hostImageUrl: string | null,
): Pick<
  Database["public"]["Tables"]["webinars"]["Update"],
  "advisor_id" | "host_name" | "host_title" | "host_bio" | "host_image_url"
> {
  if (parsed.hostName) {
    return {
      advisor_id: null,
      host_name: parsed.hostName,
      host_title: parsed.hostTitle,
      host_bio: parsed.hostBio,
      host_image_url: hostImageUrl,
    };
  }

  return {
    advisor_id: parsed.advisorId,
    host_name: null,
    host_title: null,
    host_bio: null,
    host_image_url: null,
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
  const hostPayload = webinarHostPayload(parsed.data, null);

  const { data, error } = await secret
    .from("webinars")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description,
      scheduled_at: parsed.data.scheduledAt,
      timezone_label: parsed.data.timezoneLabel,
      format: parsed.data.format,
      advisor_id: hostPayload.advisor_id ?? null,
      host_name: hostPayload.host_name,
      host_title: hostPayload.host_title,
      host_bio: hostPayload.host_bio,
      host_image_url: hostPayload.host_image_url,
      max_students: parsed.data.maxStudents,
      tags: parsed.data.tags,
      agenda: parsed.data.agenda,
      status: parsed.data.status,
      meeting_link: parsed.data.meetingLink,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createAdminWebinar]", error);
    return { ok: false, error: "Could not create webinar." };
  }

  if (parsed.data.hostImageFile) {
    try {
      const hostImageUrl = await resolveHostImageUrl(data.id, parsed.data);
      const { error: imageUpdateErr } = await secret
        .from("webinars")
        .update({ host_image_url: hostImageUrl, updated_at: new Date().toISOString() })
        .eq("id", data.id);

      if (imageUpdateErr) {
        console.error("[createAdminWebinar] host image", imageUpdateErr);
        return { ok: false, error: "Webinar created but host image could not be saved." };
      }
    } catch (uploadErr) {
      console.error("[createAdminWebinar] host image upload", uploadErr);
      const message =
        uploadErr instanceof Error ? uploadErr.message : "Could not upload host image.";
      return { ok: false, error: message };
    }
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

  let hostImageUrl = parsed.data.hostImageUrl;
  if (parsed.data.hostImageFile || parsed.data.removeHostImage) {
    try {
      hostImageUrl = await resolveHostImageUrl(id, parsed.data);
    } catch (uploadErr) {
      console.error("[updateAdminWebinar] host image upload", uploadErr);
      const message =
        uploadErr instanceof Error ? uploadErr.message : "Could not upload host image.";
      return { ok: false, error: message };
    }
  }

  const hostPayload = webinarHostPayload(parsed.data, hostImageUrl);

  const updatePayload: Database["public"]["Tables"]["webinars"]["Update"] = {
    title: parsed.data.title,
    description: parsed.data.description,
    scheduled_at: parsed.data.scheduledAt,
    timezone_label: parsed.data.timezoneLabel,
    format: parsed.data.format,
    advisor_id: hostPayload.advisor_id ?? null,
    host_name: hostPayload.host_name,
    host_title: hostPayload.host_title,
    host_bio: hostPayload.host_bio,
    host_image_url: hostPayload.host_image_url,
    max_students: parsed.data.maxStudents,
    tags: parsed.data.tags,
    agenda: parsed.data.agenda,
    status: parsed.data.status,
    meeting_link: parsed.data.meetingLink,
    updated_at: new Date().toISOString(),
  };

  if (!ACTIVE_WEBINAR_STATUSES.has(parsed.data.status)) {
    updatePayload.is_featured = false;
  }

  const { error } = await secret.from("webinars").update(updatePayload).eq("id", id);

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

export async function toggleAdminWebinarFeatured(
  webinarId: number,
): Promise<AdminWebinarActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  if (!Number.isFinite(webinarId) || webinarId <= 0) {
    return { ok: false, error: "Invalid webinar." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: webinar, error: fetchErr } = await secret
    .from("webinars")
    .select("id, status, is_featured")
    .eq("id", webinarId)
    .maybeSingle();

  if (fetchErr || !webinar) {
    console.error("[toggleAdminWebinarFeatured] fetch", fetchErr);
    return { ok: false, error: "Webinar not found." };
  }

  if (!ACTIVE_WEBINAR_STATUSES.has(webinar.status)) {
    return {
      ok: false,
      error: "Only upcoming or live webinars can be featured.",
    };
  }

  const now = new Date().toISOString();

  if (webinar.is_featured) {
    const { error } = await secret
      .from("webinars")
      .update({ is_featured: false, updated_at: now })
      .eq("id", webinarId);

    if (error) {
      console.error("[toggleAdminWebinarFeatured] unset", error);
      return { ok: false, error: "Could not update featured webinar." };
    }
  } else {
    const { error: clearErr } = await secret
      .from("webinars")
      .update({ is_featured: false, updated_at: now })
      .eq("is_featured", true);

    if (clearErr) {
      console.error("[toggleAdminWebinarFeatured] clear", clearErr);
      return { ok: false, error: "Could not update featured webinar." };
    }

    const { error: setErr } = await secret
      .from("webinars")
      .update({ is_featured: true, updated_at: now })
      .eq("id", webinarId);

    if (setErr) {
      console.error("[toggleAdminWebinarFeatured] set", setErr);
      return { ok: false, error: "Could not set featured webinar." };
    }
  }

  revalidateWebinarPaths(webinarId);
  return { ok: true };
}

export async function startAdminWebinarSession(
  webinarId: number,
  meetingLink?: string,
): Promise<StartWebinarSessionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  if (!Number.isFinite(webinarId) || webinarId <= 0) {
    return { ok: false, error: "Invalid webinar." };
  }

  const secret = await createSupabaseSecretClient();

  const { data: existing, error: existingErr } = await secret
    .from("webinars")
    .select("meeting_link")
    .eq("id", webinarId)
    .maybeSingle();

  if (existingErr || !existing) {
    console.error("[startAdminWebinarSession] fetch existing", existingErr);
    return { ok: false, error: "Webinar not found." };
  }

  const trimmedLink =
    meetingLink?.trim() || existing.meeting_link?.trim() || "";
  if (!trimmedLink) {
    return { ok: false, error: "Meeting link is required." };
  }

  try {
    new URL(trimmedLink);
  } catch {
    return { ok: false, error: "Please enter a valid meeting link URL." };
  }

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

type ExportAdminWebinarAttendeesResult =
  | { ok: true; rows: AdminWebinarAttendeeExportRow[] }
  | { ok: false; error: string };

export async function exportAdminWebinarAttendeesExcel(
  webinarId: number,
): Promise<ExportAdminWebinarAttendeesResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  if (!Number.isFinite(webinarId) || webinarId <= 0) {
    return { ok: false, error: "Invalid webinar." };
  }

  try {
    const rows = await fetchAdminWebinarAttendeesExport(webinarId);
    return { ok: true, rows };
  } catch (error) {
    console.error("[admin-webinars] export attendees", error);
    return { ok: false, error: "Could not export webinar attendees." };
  }
}
