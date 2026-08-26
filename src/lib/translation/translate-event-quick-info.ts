import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/database.types";
import {
  buildEventQuickInfoFields,
  parseEventContentAr,
  parseEventContentArMeta,
  serializeEventContentAr,
  serializeEventContentArMeta,
  type EventContentArKey,
  type EventQuickInfoContentArKey,
} from "@/lib/event-translatable-fields";
import type { TranslationLogContext } from "@/lib/translation/log-translation-response";
import { translateUniversityContentEnToAr } from "@/lib/translation/openai-translation";

type DbClient = SupabaseClient<Database>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TranslateEventQuickInfoResult =
  | { ok: true; translatedCount: number; errors: string[]; eventName: string }
  | { ok: false; error: string; eventName?: string };

export type TranslateEventQuickInfoOptions = {
  requestedBy?: string | null;
  requestId?: string;
  skipSave?: boolean;
};

export async function translateEventQuickInfoById(
  supabase: DbClient,
  eventId: string,
  options: TranslateEventQuickInfoOptions = {},
): Promise<TranslateEventQuickInfoResult> {
  if (!UUID_RE.test(eventId)) {
    return { ok: false, error: "Invalid event id." };
  }

  const logContext: TranslationLogContext = {
    entityType: "event",
    entityId: eventId,
    requestedBy: options.requestedBy?.trim() || undefined,
    requestId: options.requestId ?? crypto.randomUUID(),
  };

  const { data: event, error } = await supabase
    .from("university_events")
    .select(
      "id, event_name, start_time, end_time, timezone, region_focus, content_ar, content_ar_meta",
    )
    .eq("id", eventId)
    .maybeSingle();

  if (error || !event) {
    if (error) console.error("[translate-event-quick-info] fetch", error);
    return { ok: false, error: "Event not found." };
  }

  const eventName = event.event_name?.trim() || eventId;

  const quickInfoRow = {
    start_time: event.start_time,
    end_time: event.end_time,
    timezone: event.timezone,
    region_focus: event.region_focus,
  };

  const fields = buildEventQuickInfoFields(quickInfoRow);
  if (fields.length === 0) {
    return {
      ok: false,
      error: "No quick-info English content found for this event.",
      eventName,
    };
  }

  const existingContent = parseEventContentAr(event.content_ar);
  const existingMeta = parseEventContentArMeta(event.content_ar_meta);
  const nextContent = { ...existingContent };
  const fieldHashes: Partial<Record<EventContentArKey, string>> = {
    ...existingMeta?.field_hashes,
  };
  const errors: string[] = [];
  let translatedCount = 0;

  const apiFields = fields.map((field) => ({
    key: field.key,
    value: field.sourceText,
  }));

  try {
    const translated = await translateUniversityContentEnToAr(
      { fields: apiFields, documents: [] },
      {
        ...logContext,
        fieldKey: "quick_info",
      },
    );

    for (const field of fields) {
      const value = translated.fields[field.key]?.trim();
      if (!value) {
        errors.push(`${field.key}: Missing Arabic translation.`);
        continue;
      }
      nextContent[field.key as EventQuickInfoContentArKey] = value;
      fieldHashes[field.key] = field.sourceHash;
      translatedCount += 1;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown translation error";
    errors.push(`quick_info: ${message}`);
    console.error("[translate-event-quick-info] content", err);
  }

  if (translatedCount === 0) {
    return {
      ok: false,
      error: errors[0] ?? "Translation failed for all quick-info fields.",
      eventName,
    };
  }

  if (!options.skipSave) {
    const meta = {
      translated_at: new Date().toISOString(),
      field_hashes: fieldHashes,
    };

    const { error: updateError } = await supabase
      .from("university_events")
      .update({
        content_ar: serializeEventContentAr(nextContent),
        content_ar_meta: serializeEventContentArMeta(meta),
      })
      .eq("id", eventId);

    if (updateError) {
      console.error("[translate-event-quick-info] update", updateError);
      return {
        ok: false,
        error: "Could not save Arabic quick-info translations.",
        eventName,
      };
    }
  }

  return { ok: true, translatedCount, errors, eventName };
}
