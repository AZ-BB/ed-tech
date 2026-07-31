"use server";

import {
  fetchAdminEventsExport,
  type AdminEventExportRow,
} from "@/app/(protected)/admin/content/_lib/fetch-admin-events-export";
import { ADMIN_EVENTS_HOME } from "@/app/(protected)/admin/content/_data/content-tabs-data";
import type { Database } from "@/database.types";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type UniversityEventInsert =
  Database["public"]["Tables"]["university_events"]["Insert"];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AdminEventActionResult = { ok: true } | { ok: false; error: string };

export type ExportAdminEventsResult =
  | { ok: true; rows: AdminEventExportRow[] }
  | { ok: false; error: string };

export type CreateAdminEventResult =
  | { ok: true; eventUuid: string }
  | { ok: false; error: string };

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
    console.error("[admin-events] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return {
      ok: false as const,
      error: "You do not have permission to manage events.",
    };
  }

  return { ok: true as const };
}

function parseBool(raw: FormDataEntryValue | null, defaultValue = false): boolean {
  const t = String(raw ?? "").trim().toLowerCase();
  if (!t) return defaultValue;
  if (t === "true" || t === "1" || t === "yes" || t === "y" || t === "on") {
    return true;
  }
  if (t === "false" || t === "0" || t === "no" || t === "n") return false;
  return defaultValue;
}

function parseOptionalInt(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalDate(raw: FormDataEntryValue | null): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  return s.slice(0, 10);
}

function nullableText(raw: FormDataEntryValue | null): string | null {
  const s = String(raw ?? "").trim();
  return s || null;
}

function formToEventPayload(form: FormData): UniversityEventInsert | null {
  const eventId = String(form.get("event_id") ?? "").trim();
  const eventName = String(form.get("event_name") ?? "").trim();
  if (!eventId || !eventName) return null;

  return {
    event_id: eventId,
    event_name: eventName,
    event_type: String(form.get("event_type") ?? "").trim(),
    featured: parseBool(form.get("featured")),
    recommended_tag: nullableText(form.get("recommended_tag")),
    date_start: parseOptionalDate(form.get("date_start")),
    date_end: parseOptionalDate(form.get("date_end")),
    month: nullableText(form.get("month")),
    year: parseOptionalInt(form.get("year")),
    start_time: nullableText(form.get("start_time")),
    end_time: nullableText(form.get("end_time")),
    timezone: nullableText(form.get("timezone")),
    mode: nullableText(form.get("mode")),
    country: nullableText(form.get("country")),
    city: nullableText(form.get("city")),
    venue: nullableText(form.get("venue")),
    region_focus: nullableText(form.get("region_focus")),
    short_description: nullableText(form.get("short_description")),
    full_overview: nullableText(form.get("full_overview")),
    topics_covered: nullableText(form.get("topics_covered")),
    target_audience: nullableText(form.get("target_audience")),
    why_attend: nullableText(form.get("why_attend")),
    universities_attending: nullableText(form.get("universities_attending")),
    university_count: parseOptionalInt(form.get("university_count")),
    organizer: nullableText(form.get("organizer")),
    organizer_type: nullableText(form.get("organizer_type")),
    cost: nullableText(form.get("cost")),
    language: nullableText(form.get("language")),
    registration_status: nullableText(form.get("registration_status")),
    registration_required: nullableText(form.get("registration_required")),
    registration_url: nullableText(form.get("registration_url")),
    source_name: nullableText(form.get("source_name")),
    source_url: nullableText(form.get("source_url")),
    date_verified: parseOptionalDate(form.get("date_verified")),
    record_status: String(form.get("record_status") ?? "Active").trim() || "Active",
    internal_notes: nullableText(form.get("internal_notes")),
    prep_steps: nullableText(form.get("prep_steps")),
  };
}

function revalidateEventPaths(eventUuid?: string) {
  revalidatePath(ADMIN_EVENTS_HOME);
  if (eventUuid) {
    revalidatePath(`${ADMIN_EVENTS_HOME}/${eventUuid}`);
  }
  revalidatePath("/student/events");
}

export async function exportAdminEventsExcel(): Promise<ExportAdminEventsResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  try {
    const rows = await fetchAdminEventsExport();
    return { ok: true, rows };
  } catch (err) {
    console.error("[admin-events] export", err);
    return { ok: false, error: "Could not export events." };
  }
}

export async function createAdminEvent(
  form: FormData,
): Promise<CreateAdminEventResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const payload = formToEventPayload(form);
  if (!payload) {
    return { ok: false, error: "Event ID and name are required." };
  }

  const service = await createSupabaseSecretClient();
  const { data, error } = await service
    .from("university_events")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.error("[admin-events] create", error);
    if (error.code === "23505") {
      return { ok: false, error: "An event with this event_id already exists." };
    }
    return { ok: false, error: "Could not create event." };
  }

  revalidateEventPaths(data.id);
  return { ok: true, eventUuid: data.id };
}

export async function updateAdminEvent(
  eventUuid: string,
  form: FormData,
): Promise<AdminEventActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  if (!UUID_RE.test(eventUuid)) {
    return { ok: false, error: "Invalid event." };
  }

  const payload = formToEventPayload(form);
  if (!payload) {
    return { ok: false, error: "Event ID and name are required." };
  }

  const service = await createSupabaseSecretClient();
  const { error } = await service
    .from("university_events")
    .update(payload)
    .eq("id", eventUuid);

  if (error) {
    console.error("[admin-events] update", error);
    if (error.code === "23505") {
      return { ok: false, error: "An event with this event_id already exists." };
    }
    return { ok: false, error: "Could not update event." };
  }

  revalidateEventPaths(eventUuid);
  return { ok: true };
}

export async function deleteAdminEvent(
  eventUuid: string,
): Promise<AdminEventActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  if (!UUID_RE.test(eventUuid)) {
    return { ok: false, error: "Invalid event." };
  }

  const service = await createSupabaseSecretClient();

  const { error: activitiesError } = await service
    .from("student_activities")
    .delete()
    .eq("university_event_id", eventUuid);

  if (activitiesError) {
    console.error("[admin-events] delete activities", activitiesError);
    return { ok: false, error: "Could not clear student save links." };
  }

  const { error } = await service
    .from("university_events")
    .delete()
    .eq("id", eventUuid);

  if (error) {
    console.error("[admin-events] delete", error);
    return { ok: false, error: "Could not delete event." };
  }

  revalidateEventPaths();
  return { ok: true };
}
