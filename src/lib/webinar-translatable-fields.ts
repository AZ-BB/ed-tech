import type { Json } from "@/database.types";
import { resolveWebinarHost, type WebinarHostRow } from "@/lib/webinar-host";
import { createHash } from "crypto";

/** Scalar keys stored in webinars.content_ar */
export type WebinarContentArScalarKey =
  | "title"
  | "description"
  | "format"
  | "speakerName"
  | "speakerTitle"
  | "speakerBio";

export type WebinarContentArKey =
  | WebinarContentArScalarKey
  | "tags"
  | "agenda";

export type WebinarContentAr = Partial<Record<WebinarContentArScalarKey, string>> & {
  tags?: string[];
  agenda?: string[];
};

export type WebinarContentArMeta = {
  translated_at: string;
  field_hashes: Partial<Record<WebinarContentArKey, string>>;
};

export type WebinarTranslationStatus = "not_translated" | "up_to_date" | "outdated";

export type WebinarSourceRow = {
  title: string;
  description: string | null;
  format: string;
  tags: string[] | null;
  agenda: unknown;
  host_name: string | null;
  host_title: string | null;
  host_bio: string | null;
  host_image_url: string | null;
  advisors: WebinarHostRow["advisors"];
};

export type TranslatableWebinarField = {
  key: WebinarContentArScalarKey;
  sourceText: string;
  sourceHash: string;
};

function hashSource(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function parseAgenda(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

export function parseWebinarContentAr(raw: Json | null | undefined): WebinarContentAr {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const out: WebinarContentAr = {};

  const stringKeys: WebinarContentArScalarKey[] = [
    "title",
    "description",
    "format",
    "speakerName",
    "speakerTitle",
    "speakerBio",
  ];

  for (const key of stringKeys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim();
    }
  }

  for (const listKey of ["tags", "agenda"] as const) {
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

export function parseWebinarContentArMeta(
  raw: Json | null | undefined,
): WebinarContentArMeta | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const translatedAt =
    typeof obj.translated_at === "string" && obj.translated_at.trim()
      ? obj.translated_at.trim()
      : null;
  if (!translatedAt) return null;

  const fieldHashesRaw = obj.field_hashes;
  const field_hashes: Partial<Record<WebinarContentArKey, string>> = {};
  if (fieldHashesRaw && typeof fieldHashesRaw === "object" && !Array.isArray(fieldHashesRaw)) {
    for (const [key, value] of Object.entries(fieldHashesRaw)) {
      if (typeof value === "string" && value.trim()) {
        field_hashes[key as WebinarContentArKey] = value.trim();
      }
    }
  }

  return { translated_at: translatedAt, field_hashes };
}

export function getWebinarSpeakerSource(row: WebinarSourceRow): {
  speakerName: string;
  speakerTitle: string;
  speakerBio: string;
} {
  const host = resolveWebinarHost(row);
  return {
    speakerName: host.speakerName,
    speakerTitle: host.speakerTitle,
    speakerBio: host.speakerBio,
  };
}

export function buildTranslatableWebinarFields(
  row: WebinarSourceRow,
): TranslatableWebinarField[] {
  const fields: TranslatableWebinarField[] = [];

  function addStringField(key: WebinarContentArScalarKey, sourceText: string) {
    const trimmed = sourceText.trim();
    if (!trimmed) return;
    fields.push({ key, sourceText: trimmed, sourceHash: hashSource(trimmed) });
  }

  addStringField("title", row.title);
  addStringField("description", row.description ?? "");
  addStringField("format", row.format);

  const speaker = getWebinarSpeakerSource(row);
  addStringField("speakerName", speaker.speakerName);
  addStringField("speakerTitle", speaker.speakerTitle);
  addStringField("speakerBio", speaker.speakerBio);

  return fields;
}

export function getWebinarTags(row: WebinarSourceRow): string[] {
  return (row.tags ?? []).map((t) => t.trim()).filter(Boolean);
}

export function getWebinarAgendaLines(row: WebinarSourceRow): string[] {
  return parseAgenda(row.agenda);
}

export function webinarListSourceHash(lines: string[]): string {
  return hashSource(lines.join("\n"));
}

export function webinarSpeakerSourceHash(row: WebinarSourceRow): string {
  const speaker = getWebinarSpeakerSource(row);
  return hashSource(
    [speaker.speakerName, speaker.speakerTitle, speaker.speakerBio].join("\n"),
  );
}

export function getWebinarTranslationStatus(
  row: WebinarSourceRow,
  contentAr: WebinarContentAr,
  meta: WebinarContentArMeta | null,
): WebinarTranslationStatus {
  const hasAnyArabic = Object.keys(contentAr).length > 0;
  if (!hasAnyArabic || !meta) return "not_translated";

  const currentFields = buildTranslatableWebinarFields(row);
  for (const field of currentFields) {
    const storedHash = meta.field_hashes[field.key];
    if (!storedHash || storedHash !== field.sourceHash) {
      return "outdated";
    }
  }

  const tags = getWebinarTags(row);
  if (tags.length > 0) {
    const hash = webinarListSourceHash(tags);
    const stored = meta.field_hashes.tags;
    if (!stored || stored !== hash) return "outdated";
  }

  const agenda = getWebinarAgendaLines(row);
  if (agenda.length > 0) {
    const hash = webinarListSourceHash(agenda);
    const stored = meta.field_hashes.agenda;
    if (!stored || stored !== hash) return "outdated";
  }

  return "up_to_date";
}

export function serializeWebinarContentAr(content: WebinarContentAr): Json {
  return content as Json;
}

export function serializeWebinarContentArMeta(meta: WebinarContentArMeta): Json {
  return meta as Json;
}

export function listFieldValue(lines: string[]): string {
  return lines.join("\n");
}

export function listFromFieldValue(value: string): string[] {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}
