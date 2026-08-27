import type { Json } from "@/database.types";
import { createHash } from "crypto";

export type UniversityProgramTranslationStatus =
  | "not_translated"
  | "up_to_date"
  | "outdated";

export type UniversityProgramContentArKey =
  | "ranking_note"
  | "tuition_note"
  | "short_description"
  | "program_school_note";

export type UniversityProgramContentAr = Partial<
  Record<UniversityProgramContentArKey, string>
>;

export type UniversityProgramContentArMeta = {
  translated_at: string;
  field_hashes: Record<string, string>;
};

export type TranslatableUniversityProgramField = {
  key: UniversityProgramContentArKey;
  sourceText: string;
  sourceHash: string;
};

export type UniversityProgramSourceRow = {
  ranking_note: string | null;
  tuition_note: string | null;
  short_description: string | null;
  program_school_note: string | null;
};

function hashSource(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function addStringField(
  fields: TranslatableUniversityProgramField[],
  key: UniversityProgramContentArKey,
  sourceText: string,
) {
  const trimmed = sourceText.trim();
  if (!trimmed) return;
  fields.push({ key, sourceText: trimmed, sourceHash: hashSource(trimmed) });
}

export function parseUniversityProgramContentAr(
  raw: Json | null | undefined,
): UniversityProgramContentAr {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const out: UniversityProgramContentAr = {};

  for (const key of [
    "ranking_note",
    "tuition_note",
    "short_description",
    "program_school_note",
  ] as const) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim();
    }
  }

  return out;
}

export function parseUniversityProgramContentArMeta(
  raw: Json | null | undefined,
): UniversityProgramContentArMeta | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const translatedAt =
    typeof obj.translated_at === "string" && obj.translated_at.trim()
      ? obj.translated_at.trim()
      : null;
  if (!translatedAt) return null;

  const field_hashes: Record<string, string> = {};
  const hashesRaw = obj.field_hashes;
  if (hashesRaw && typeof hashesRaw === "object" && !Array.isArray(hashesRaw)) {
    for (const [key, value] of Object.entries(hashesRaw)) {
      if (typeof value === "string" && value.trim()) {
        field_hashes[key] = value.trim();
      }
    }
  }

  return { translated_at: translatedAt, field_hashes };
}

export function serializeUniversityProgramContentAr(
  content: UniversityProgramContentAr,
): Json {
  return content as Json;
}

export function serializeUniversityProgramContentArMeta(
  meta: UniversityProgramContentArMeta,
): Json {
  return meta as Json;
}

export function buildTranslatableUniversityProgramFields(
  row: UniversityProgramSourceRow,
): TranslatableUniversityProgramField[] {
  const fields: TranslatableUniversityProgramField[] = [];
  addStringField(fields, "ranking_note", row.ranking_note ?? "");
  addStringField(fields, "tuition_note", row.tuition_note ?? "");
  addStringField(fields, "short_description", row.short_description ?? "");
  addStringField(fields, "program_school_note", row.program_school_note ?? "");
  return fields;
}

function hasAnyUniversityProgramArabic(
  contentAr: UniversityProgramContentAr,
): boolean {
  return Object.values(contentAr).some(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
}

export function getUniversityProgramTranslationStatus(
  row: UniversityProgramSourceRow,
  contentAr: UniversityProgramContentAr,
  meta: UniversityProgramContentArMeta | null,
): UniversityProgramTranslationStatus {
  if (!hasAnyUniversityProgramArabic(contentAr) || !meta) {
    return "not_translated";
  }

  const currentFields = buildTranslatableUniversityProgramFields(row);
  for (const field of currentFields) {
    const storedHash = meta.field_hashes[field.key];
    if (!storedHash || storedHash !== field.sourceHash) {
      return "outdated";
    }
  }

  return "up_to_date";
}

export function applyFlatTranslationsToUniversityProgramContentAr(
  existing: UniversityProgramContentAr,
  translations: Record<string, string>,
): UniversityProgramContentAr {
  const next: UniversityProgramContentAr = { ...existing };

  for (const key of [
    "ranking_note",
    "tuition_note",
    "short_description",
    "program_school_note",
  ] as const) {
    const value = translations[key]?.trim();
    if (value) next[key] = value;
  }

  return next;
}

export const UNIVERSITY_PROGRAM_TRANSLATION_CHUNK_SIZE = 20;

export function chunkUniversityProgramTranslatableFields(
  fields: TranslatableUniversityProgramField[],
  chunkSize = UNIVERSITY_PROGRAM_TRANSLATION_CHUNK_SIZE,
): TranslatableUniversityProgramField[][] {
  const chunks: TranslatableUniversityProgramField[][] = [];
  for (let i = 0; i < fields.length; i += chunkSize) {
    chunks.push(fields.slice(i, i + chunkSize));
  }
  return chunks;
}
