import type { Json } from "@/database.types";
import { normalizeInternshipBulletList } from "@/lib/internship-bullet-list";
import { createHash } from "crypto";

/** Scalar keys stored in internships.content_ar */
export type InternshipContentArScalarKey =
  | "name"
  | "provider"
  | "locationLabel"
  | "field"
  | "payLabel"
  | "duration"
  | "summary"
  | "eligibility"
  | "howToApply"
  | "countryName";

export type InternshipContentArKey =
  | InternshipContentArScalarKey
  | "whatYoullDo"
  | "whatYoullGain";

export type InternshipContentAr = Partial<
  Record<InternshipContentArScalarKey, string>
> & {
  whatYoullDo?: string[];
  whatYoullGain?: string[];
};

export type InternshipContentArMeta = {
  translated_at: string;
  field_hashes: Partial<Record<InternshipContentArKey, string>>;
};

export type InternshipTranslationStatus = "not_translated" | "up_to_date" | "outdated";

export type InternshipSourceRow = {
  name: string;
  provider: string;
  country_code: string;
  location_label: string;
  field: string;
  pay_label: string;
  duration: string;
  summary: string;
  what_youll_do: string[] | null;
  what_youll_gain: string[] | null;
  eligibility: string;
  how_to_apply: string;
};

export type TranslatableInternshipField = {
  key: InternshipContentArScalarKey;
  sourceText: string;
  sourceHash: string;
};

function hashSource(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function parseInternshipContentAr(raw: Json | null | undefined): InternshipContentAr {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const out: InternshipContentAr = {};

  const stringKeys: InternshipContentArScalarKey[] = [
    "name",
    "provider",
    "locationLabel",
    "field",
    "payLabel",
    "duration",
    "summary",
    "eligibility",
    "howToApply",
    "countryName",
  ];

  for (const key of stringKeys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim();
    }
  }

  for (const listKey of ["whatYoullDo", "whatYoullGain"] as const) {
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

export function parseInternshipContentArMeta(
  raw: Json | null | undefined,
): InternshipContentArMeta | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const translatedAt =
    typeof obj.translated_at === "string" && obj.translated_at.trim()
      ? obj.translated_at.trim()
      : null;
  if (!translatedAt) return null;

  const fieldHashesRaw = obj.field_hashes;
  const field_hashes: Partial<Record<InternshipContentArKey, string>> = {};
  if (fieldHashesRaw && typeof fieldHashesRaw === "object" && !Array.isArray(fieldHashesRaw)) {
    for (const [key, value] of Object.entries(fieldHashesRaw)) {
      if (typeof value === "string" && value.trim()) {
        field_hashes[key as InternshipContentArKey] = value.trim();
      }
    }
  }

  return { translated_at: translatedAt, field_hashes };
}

export function buildTranslatableInternshipFields(
  row: InternshipSourceRow,
): TranslatableInternshipField[] {
  const fields: TranslatableInternshipField[] = [];

  function addStringField(key: InternshipContentArScalarKey, sourceText: string) {
    const trimmed = sourceText.trim();
    if (!trimmed) return;
    fields.push({ key, sourceText: trimmed, sourceHash: hashSource(trimmed) });
  }

  addStringField("name", row.name);
  addStringField("provider", row.provider);
  addStringField("locationLabel", row.location_label);
  addStringField("field", row.field);
  addStringField("payLabel", row.pay_label);
  addStringField("duration", row.duration);
  addStringField("summary", row.summary);
  addStringField("eligibility", row.eligibility);
  addStringField("howToApply", row.how_to_apply);

  return fields;
}

export function getInternshipWhatYoullDoLines(row: InternshipSourceRow): string[] {
  return normalizeInternshipBulletList(row.what_youll_do);
}

export function getInternshipWhatYoullGainLines(row: InternshipSourceRow): string[] {
  return normalizeInternshipBulletList(row.what_youll_gain);
}

export function internshipBulletListSourceHash(lines: string[]): string {
  return hashSource(lines.join("\n"));
}

export function internshipCountrySourceHash(
  countryCode: string | null | undefined,
): string | null {
  const trimmed = countryCode?.trim().toUpperCase();
  if (!trimmed) return null;
  return hashSource(trimmed);
}

export function getInternshipTranslationStatus(
  row: InternshipSourceRow,
  contentAr: InternshipContentAr,
  meta: InternshipContentArMeta | null,
): InternshipTranslationStatus {
  const hasAnyArabic = Object.keys(contentAr).length > 0;
  if (!hasAnyArabic || !meta) return "not_translated";

  const currentFields = buildTranslatableInternshipFields(row);
  const doLines = getInternshipWhatYoullDoLines(row);
  const gainLines = getInternshipWhatYoullGainLines(row);

  for (const field of currentFields) {
    const storedHash = meta.field_hashes[field.key];
    if (!storedHash || storedHash !== field.sourceHash) {
      return "outdated";
    }
  }

  if (doLines.length > 0) {
    const hash = internshipBulletListSourceHash(doLines);
    const stored = meta.field_hashes.whatYoullDo;
    if (!stored || stored !== hash) return "outdated";
  }

  if (gainLines.length > 0) {
    const hash = internshipBulletListSourceHash(gainLines);
    const stored = meta.field_hashes.whatYoullGain;
    if (!stored || stored !== hash) return "outdated";
  }

  const countryHash = internshipCountrySourceHash(row.country_code);
  if (countryHash) {
    const storedCountryHash = meta.field_hashes.countryName;
    if (!storedCountryHash || storedCountryHash !== countryHash) {
      return "outdated";
    }
  }

  return "up_to_date";
}

export function serializeInternshipContentAr(content: InternshipContentAr): Json {
  return content as Json;
}

export function serializeInternshipContentArMeta(meta: InternshipContentArMeta): Json {
  return meta as Json;
}

export function bulletListFieldValue(lines: string[]): string {
  return lines.join("\n");
}

export function bulletListFromFieldValue(value: string): string[] {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}
