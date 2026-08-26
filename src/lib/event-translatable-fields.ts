import type { Json } from "@/database.types";
import {
  formatEventTimeLabel,
  formatRegionFocusLabel,
  splitSemicolonList,
} from "@/lib/event-type-styles";
import { createHash } from "crypto";

/** Quick-info sidebar keys (معلومات سريعة) — translated separately from main body content */
export const EVENT_QUICK_INFO_CONTENT_AR_KEYS = ["timeDisplay", "regionFocus"] as const;
export type EventQuickInfoContentArKey = (typeof EVENT_QUICK_INFO_CONTENT_AR_KEYS)[number];

/** Scalar keys stored in university_events.content_ar */
export type EventContentArScalarKey =
  | "eventName"
  | "eventType"
  | "recommendedTag"
  | "shortDescription"
  | "fullOverview"
  | "city"
  | "venue"
  | "organizer"
  | "cost"
  | "regionFocus"
  | "timeDisplay"
  | "country";

export type EventContentArKey =
  | EventContentArScalarKey
  | "topicsCovered"
  | "targetAudience"
  | "whyAttend"
  | "prepSteps"
  | "universitiesAttending";

export type EventContentAr = Partial<Record<EventContentArScalarKey, string>> & {
  topicsCovered?: string[];
  targetAudience?: string[];
  whyAttend?: string[];
  prepSteps?: string[];
  universitiesAttending?: string[];
};

export type EventContentArMeta = {
  translated_at: string;
  field_hashes: Partial<Record<EventContentArKey, string>>;
};

export type EventTranslationStatus = "not_translated" | "up_to_date" | "outdated";

export type EventSourceRow = {
  event_name: string;
  event_type: string;
  recommended_tag: string | null;
  short_description: string | null;
  full_overview: string | null;
  topics_covered: string | null;
  target_audience: string | null;
  why_attend: string | null;
  prep_steps: string | null;
  city: string | null;
  venue: string | null;
  organizer: string | null;
  universities_attending: string | null;
  cost: string | null;
  region_focus: string | null;
  country: string | null;
};

export type EventQuickInfoSourceRow = {
  start_time: string | null;
  end_time: string | null;
  timezone: string | null;
  region_focus: string | null;
};

export type TranslatableEventField = {
  key: EventContentArScalarKey;
  sourceText: string;
  sourceHash: string;
};

function hashSource(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function parseEventContentAr(raw: Json | null | undefined): EventContentAr {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const out: EventContentAr = {};

  const stringKeys: EventContentArScalarKey[] = [
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
  ];

  for (const key of stringKeys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim();
    }
  }

  for (const listKey of [
    "topicsCovered",
    "targetAudience",
    "whyAttend",
    "prepSteps",
    "universitiesAttending",
  ] as const) {
    const list = obj[listKey];
    if (Array.isArray(list)) {
      const parsed = list.filter(
        (x): x is string => typeof x === "string" && x.trim().length > 0,
      );
      if (parsed.length > 0) out[listKey] = parsed;
    }
  }

  return out;
}

export function parseEventContentArMeta(
  raw: Json | null | undefined,
): EventContentArMeta | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const translatedAt =
    typeof obj.translated_at === "string" && obj.translated_at.trim()
      ? obj.translated_at.trim()
      : null;
  if (!translatedAt) return null;

  const fieldHashesRaw = obj.field_hashes;
  const field_hashes: Partial<Record<EventContentArKey, string>> = {};
  if (fieldHashesRaw && typeof fieldHashesRaw === "object" && !Array.isArray(fieldHashesRaw)) {
    for (const [key, value] of Object.entries(fieldHashesRaw)) {
      if (typeof value === "string" && value.trim()) {
        field_hashes[key as EventContentArKey] = value.trim();
      }
    }
  }

  return { translated_at: translatedAt, field_hashes };
}

export function buildTranslatableEventFields(row: EventSourceRow): TranslatableEventField[] {
  const fields: TranslatableEventField[] = [];

  function addStringField(key: EventContentArScalarKey, sourceText: string) {
    const trimmed = sourceText.trim();
    if (!trimmed) return;
    fields.push({ key, sourceText: trimmed, sourceHash: hashSource(trimmed) });
  }

  addStringField("eventName", row.event_name);
  addStringField("eventType", row.event_type);
  addStringField("recommendedTag", row.recommended_tag ?? "");
  addStringField("shortDescription", row.short_description ?? "");
  addStringField("fullOverview", row.full_overview ?? "");
  addStringField("city", row.city ?? "");
  addStringField("venue", row.venue ?? "");
  addStringField("organizer", row.organizer ?? "");
  addStringField("cost", row.cost ?? "");
  addStringField("country", row.country ?? "");

  return fields;
}

export function buildEventQuickInfoFields(
  row: EventQuickInfoSourceRow,
): { key: EventQuickInfoContentArKey; sourceText: string; sourceHash: string }[] {
  const fields: { key: EventQuickInfoContentArKey; sourceText: string; sourceHash: string }[] =
    [];

  function add(key: EventQuickInfoContentArKey, sourceText: string) {
    const trimmed = sourceText.trim();
    if (!trimmed) return;
    fields.push({ key, sourceText: trimmed, sourceHash: hashSource(trimmed) });
  }

  add(
    "timeDisplay",
    formatEventTimeLabel(row.start_time, row.end_time, row.timezone),
  );
  add("regionFocus", formatRegionFocusLabel(row.region_focus));

  return fields;
}

export function getEventQuickInfoTranslationStatus(
  row: EventQuickInfoSourceRow,
  contentAr: EventContentAr,
  meta: EventContentArMeta | null,
): EventTranslationStatus {
  const fields = buildEventQuickInfoFields(row);
  if (fields.length === 0) return "up_to_date";

  const hasAnyQuickInfoAr = fields.some((field) => Boolean(contentAr[field.key]?.trim()));
  if (!hasAnyQuickInfoAr || !meta) return "not_translated";

  for (const field of fields) {
    const storedHash = meta.field_hashes[field.key];
    if (!storedHash || storedHash !== field.sourceHash) {
      return "outdated";
    }
  }

  return "up_to_date";
}

export function getEventSemicolonListLines(value: string | null | undefined): string[] {
  return splitSemicolonList(value);
}

export function eventSemicolonListSourceHash(lines: string[]): string {
  return hashSource(lines.join("\n"));
}

export function getEventTranslationStatus(
  row: EventSourceRow,
  contentAr: EventContentAr,
  meta: EventContentArMeta | null,
): EventTranslationStatus {
  const hasAnyArabic = Object.keys(contentAr).length > 0;
  if (!hasAnyArabic || !meta) return "not_translated";

  const currentFields = buildTranslatableEventFields(row);
  for (const field of currentFields) {
    const storedHash = meta.field_hashes[field.key];
    if (!storedHash || storedHash !== field.sourceHash) {
      return "outdated";
    }
  }

  const listChecks: { key: EventContentArKey; lines: string[] }[] = [
    { key: "topicsCovered", lines: getEventSemicolonListLines(row.topics_covered) },
    { key: "targetAudience", lines: getEventSemicolonListLines(row.target_audience) },
    { key: "whyAttend", lines: getEventSemicolonListLines(row.why_attend) },
    { key: "prepSteps", lines: getEventSemicolonListLines(row.prep_steps) },
    {
      key: "universitiesAttending",
      lines: getEventSemicolonListLines(row.universities_attending),
    },
  ];

  for (const { key, lines } of listChecks) {
    if (lines.length === 0) continue;
    const hash = eventSemicolonListSourceHash(lines);
    const stored = meta.field_hashes[key];
    if (!stored || stored !== hash) return "outdated";
  }

  return "up_to_date";
}

export function serializeEventContentAr(content: EventContentAr): Json {
  return content as Json;
}

export function serializeEventContentArMeta(meta: EventContentArMeta): Json {
  return meta as Json;
}

export function semicolonListFieldValue(lines: string[]): string {
  return lines.join("\n");
}

export function semicolonListFromFieldValue(value: string): string[] {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function joinSemicolonList(lines: string[]): string {
  return lines.join("; ");
}
