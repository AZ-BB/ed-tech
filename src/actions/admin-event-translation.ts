"use server";

import type { Json } from "@/database.types";
import {
  serializeEventContentAr,
  type EventContentAr,
  type EventContentArKey,
} from "@/lib/event-translatable-fields";
import { translateEventById } from "@/lib/translation/translate-event";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_CONTENT_AR_KEYS = new Set<EventContentArKey>([
  "eventName",
  "eventType",
  "recommendedTag",
  "shortDescription",
  "fullOverview",
  "city",
  "venue",
  "organizer",
  "cost",
  "regionFocus",
  "timeDisplay",
  "country",
  "topicsCovered",
  "targetAudience",
  "whyAttend",
  "prepSteps",
  "universitiesAttending",
]);

export type TranslateAdminEventResult =
  | { ok: true; translatedCount: number; errors: string[] }
  | { ok: false; error: string };

export type UpdateAdminEventArabicContentResult =
  | { ok: true }
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
    console.error("[admin-event-translation] admin lookup", adminError);
    return { ok: false as const, error: "Could not verify admin access." };
  }

  if (!admin) {
    return {
      ok: false as const,
      error: "You do not have permission to manage event translations.",
    };
  }

  return { ok: true as const, userId: user.id };
}

function revalidateEventPaths(eventId: string) {
  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/events/${eventId}`);
  revalidatePath("/student/events");
}

function sanitizeContentAr(input: EventContentAr): EventContentAr {
  const out: EventContentAr = {};

  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_CONTENT_AR_KEYS.has(key as EventContentArKey)) continue;

    if (
      key === "topicsCovered" ||
      key === "targetAudience" ||
      key === "whyAttend" ||
      key === "prepSteps" ||
      key === "universitiesAttending"
    ) {
      if (!Array.isArray(value)) continue;
      const items = value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);
      if (items.length > 0) {
        out[key] = items;
      }
      continue;
    }

    if (typeof value === "string" && value.trim()) {
      (out as Record<string, string>)[key] = value.trim();
    }
  }

  return out;
}

export async function translateAdminEvent(
  eventId: string,
): Promise<TranslateAdminEventResult> {
  if (!UUID_RE.test(eventId)) {
    return { ok: false, error: "Invalid event id." };
  }

  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const supabase = await createSupabaseSecretClient();
  const result = await translateEventById(supabase, eventId, {
    requestedBy: access.userId,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidateEventPaths(eventId);
  return {
    ok: true,
    translatedCount: result.translatedCount,
    errors: result.errors,
  };
}

export async function updateAdminEventArabicContent(
  eventId: string,
  contentArInput: EventContentAr,
): Promise<UpdateAdminEventArabicContentResult> {
  if (!UUID_RE.test(eventId)) {
    return { ok: false, error: "Invalid event id." };
  }

  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const contentAr = sanitizeContentAr(contentArInput);
  const supabase = await createSupabaseSecretClient();

  const { error } = await supabase
    .from("university_events")
    .update({
      content_ar: serializeEventContentAr(contentAr) as Json,
    })
    .eq("id", eventId);

  if (error) {
    console.error("[admin-event-translation] manual update", error);
    return { ok: false, error: "Could not save Arabic content." };
  }

  revalidateEventPaths(eventId);
  return { ok: true };
}
