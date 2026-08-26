import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/database.types";
import {
  buildTranslatableEventFields,
  eventSemicolonListSourceHash,
  getEventSemicolonListLines,
  parseEventContentAr,
  parseEventContentArMeta,
  semicolonListFieldValue,
  semicolonListFromFieldValue,
  serializeEventContentAr,
  serializeEventContentArMeta,
  type EventContentArKey,
  type EventContentArScalarKey,
} from "@/lib/event-translatable-fields";
import type { TranslationLogContext } from "@/lib/translation/log-translation-response";
import { translateUniversityContentEnToAr } from "@/lib/translation/openai-translation";

type DbClient = SupabaseClient<Database>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TranslateEventResult =
  | { ok: true; translatedCount: number; errors: string[]; eventName: string }
  | { ok: false; error: string; eventName?: string };

export type TranslateEventOptions = {
  requestedBy?: string | null;
  requestId?: string;
  skipSave?: boolean;
};

type SemicolonListField = {
  key: Extract<
    EventContentArKey,
    "topicsCovered" | "targetAudience" | "whyAttend" | "prepSteps" | "universitiesAttending"
  >;
  lines: string[];
};

export async function translateEventById(
  supabase: DbClient,
  eventId: string,
  options: TranslateEventOptions = {},
): Promise<TranslateEventResult> {
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
      "id, event_name, event_type, recommended_tag, short_description, full_overview, topics_covered, target_audience, why_attend, prep_steps, city, venue, organizer, universities_attending, cost, region_focus, country, content_ar, content_ar_meta",
    )
    .eq("id", eventId)
    .maybeSingle();

  if (error || !event) {
    if (error) console.error("[translate-event] fetch", error);
    return { ok: false, error: "Event not found." };
  }

  const eventName = event.event_name?.trim() || eventId;

  const row = {
    event_name: event.event_name,
    event_type: event.event_type,
    recommended_tag: event.recommended_tag,
    short_description: event.short_description,
    full_overview: event.full_overview,
    topics_covered: event.topics_covered,
    target_audience: event.target_audience,
    why_attend: event.why_attend,
    prep_steps: event.prep_steps,
    city: event.city,
    venue: event.venue,
    organizer: event.organizer,
    universities_attending: event.universities_attending,
    cost: event.cost,
    region_focus: event.region_focus,
    country: event.country,
  };

  const fields = buildTranslatableEventFields(row);
  const listFields: SemicolonListField[] = [
    { key: "topicsCovered", lines: getEventSemicolonListLines(row.topics_covered) },
    { key: "targetAudience", lines: getEventSemicolonListLines(row.target_audience) },
    { key: "whyAttend", lines: getEventSemicolonListLines(row.why_attend) },
    { key: "prepSteps", lines: getEventSemicolonListLines(row.prep_steps) },
    {
      key: "universitiesAttending",
      lines: getEventSemicolonListLines(row.universities_attending),
    },
  ].filter((item): item is SemicolonListField => item.lines.length > 0);

  if (fields.length === 0 && listFields.length === 0) {
    return {
      ok: false,
      error: "No translatable English content found for this event.",
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

  const apiFields: { key: string; value: string }[] = fields.map((field) => ({
    key: field.key,
    value: field.sourceText,
  }));

  for (const listField of listFields) {
    apiFields.push({
      key: listField.key,
      value: semicolonListFieldValue(listField.lines),
    });
  }

  if (apiFields.length > 0) {
    try {
      const translated = await translateUniversityContentEnToAr(
        { fields: apiFields, documents: [] },
        {
          ...logContext,
          fieldKey: "content",
        },
      );

      for (const field of fields) {
        const value = translated.fields[field.key]?.trim();
        if (!value) {
          errors.push(`${field.key}: Missing Arabic translation.`);
          continue;
        }
        nextContent[field.key] = value;
        fieldHashes[field.key] = field.sourceHash;
        translatedCount += 1;
      }

      for (const listField of listFields) {
        const gainValue = translated.fields[listField.key]?.trim();
        if (!gainValue) {
          errors.push(`${listField.key}: Missing Arabic translation.`);
          continue;
        }
        const parsed = semicolonListFromFieldValue(gainValue);
        if (parsed.length === listField.lines.length) {
          nextContent[listField.key] = parsed;
          fieldHashes[listField.key] = eventSemicolonListSourceHash(listField.lines);
          translatedCount += parsed.length;
        } else {
          errors.push(
            `${listField.key}: Expected ${listField.lines.length} translations, got ${parsed.length}.`,
          );
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown translation error";
      errors.push(`content: ${message}`);
      console.error("[translate-event] content", err);
    }
  }

  if (translatedCount === 0) {
    return {
      ok: false,
      error: errors[0] ?? "Translation failed for all fields.",
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
      console.error("[translate-event] update", updateError);
      return {
        ok: false,
        error: "Could not save Arabic translations.",
        eventName,
      };
    }
  }

  return { ok: true, translatedCount, errors, eventName };
}
