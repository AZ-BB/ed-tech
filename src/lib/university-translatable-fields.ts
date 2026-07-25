import type { Json } from "@/database.types";
import {
  livingCostLabel,
  tuitionDetailLabel,
  tuitionSentenceLabel,
} from "@/lib/university-cost-display";
import { createHash } from "crypto";

/** Keys stored in universities.content_ar */
export type UniversityContentArKey =
  | "name"
  | "description"
  | "tuition_display"
  | "living_display"
  | "tuition_sentence"
  | "living_sentence"
  | "sat_policy"
  | "method"
  | "intakes"
  | "city"
  | "country_name"
  | "documents"
  | "scholarship_note";

export type UniversityContentAr = Partial<
  Record<Exclude<UniversityContentArKey, "documents">, string>
> & {
  documents?: string[];
};

export type UniversityContentArMeta = {
  translated_at: string;
  field_hashes: Partial<Record<UniversityContentArKey, string>>;
};

export type UniversityTranslationStatus = "not_translated" | "up_to_date" | "outdated";

export type UniversitySourceRow = {
  name: string;
  city: string | null;
  country_code: string | null;
  description: string | null;
  tuition_display: string | null;
  tuition_per_year: number | null;
  living_display: string | null;
  estimated_living_cost_per_year: number | null;
  sat_policy: string | null;
  method: string | null;
  intakes: string | null;
  documents: Json | null;
  is_scholarship_available: boolean;
};

export type TranslatableUniversityField = {
  key: UniversityContentArKey;
  sourceText: string;
  sourceHash: string;
};

const SCHOLARSHIP_NOTE_EN =
  "Scholarships may be available to qualified students. Check the university website for the latest details.";

function hashSource(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function documentsFromJson(doc: Json | null): string[] {
  if (doc == null) return [];
  if (Array.isArray(doc)) {
    return doc.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  }
  if (typeof doc === "object" && doc !== null && "items" in doc) {
    const items = (doc as { items: unknown }).items;
    if (Array.isArray(items)) {
      return items.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    }
  }
  return [];
}

export function parseUniversityContentAr(raw: Json | null | undefined): UniversityContentAr {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const out: UniversityContentAr = {};

  const stringKeys: Exclude<UniversityContentArKey, "documents">[] = [
    "name",
    "description",
    "tuition_display",
    "living_display",
    "tuition_sentence",
    "living_sentence",
    "sat_policy",
    "method",
    "intakes",
    "city",
    "country_name",
    "scholarship_note",
  ];

  for (const key of stringKeys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim();
    }
  }

  const docs = obj.documents;
  if (Array.isArray(docs)) {
    const parsed = docs.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    if (parsed.length > 0) out.documents = parsed;
  }

  return out;
}

export function parseUniversityContentArMeta(
  raw: Json | null | undefined,
): UniversityContentArMeta | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const translatedAt =
    typeof obj.translated_at === "string" && obj.translated_at.trim()
      ? obj.translated_at.trim()
      : null;
  if (!translatedAt) return null;

  const fieldHashesRaw = obj.field_hashes;
  const field_hashes: Partial<Record<UniversityContentArKey, string>> = {};
  if (fieldHashesRaw && typeof fieldHashesRaw === "object" && !Array.isArray(fieldHashesRaw)) {
    for (const [key, value] of Object.entries(fieldHashesRaw)) {
      if (typeof value === "string" && value.trim()) {
        field_hashes[key as UniversityContentArKey] = value.trim();
      }
    }
  }

  return { translated_at: translatedAt, field_hashes };
}

export function buildTranslatableUniversityFields(
  row: UniversitySourceRow,
): TranslatableUniversityField[] {
  const fields: TranslatableUniversityField[] = [];

  function addStringField(key: Exclude<UniversityContentArKey, "documents">, sourceText: string) {
    const trimmed = sourceText.trim();
    if (!trimmed) return;
    fields.push({ key, sourceText: trimmed, sourceHash: hashSource(trimmed) });
  }

  addStringField("name", row.name);
  addStringField("description", row.description ?? "");
  addStringField("city", row.city ?? "");
  addStringField(
    "tuition_display",
    tuitionDetailLabel(row.tuition_display, row.tuition_per_year),
  );
  addStringField(
    "living_display",
    livingCostLabel(row.living_display, row.estimated_living_cost_per_year),
  );
  addStringField(
    "tuition_sentence",
    tuitionSentenceLabel(row.tuition_display, row.tuition_per_year),
  );
  addStringField(
    "living_sentence",
    livingCostLabel(row.living_display, row.estimated_living_cost_per_year),
  );
  addStringField("sat_policy", row.sat_policy ?? "");
  addStringField("method", row.method ?? "");

  if (row.is_scholarship_available) {
    addStringField("scholarship_note", SCHOLARSHIP_NOTE_EN);
  }

  return fields;
}

export function getUniversityDocumentLines(row: UniversitySourceRow): string[] {
  return documentsFromJson(row.documents)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function universityDocumentsSourceHash(lines: string[]): string {
  return hashSource(lines.join("\n"));
}

export function universityIntakesSourceHash(intakes: string | null | undefined): string | null {
  const trimmed = intakes?.trim();
  if (!trimmed) return null;
  return hashSource(trimmed);
}

export function universityCitySourceHash(city: string | null | undefined): string | null {
  const trimmed = city?.trim();
  if (!trimmed) return null;
  return hashSource(trimmed);
}

export function universityCountrySourceHash(countryCode: string | null | undefined): string | null {
  const trimmed = countryCode?.trim().toUpperCase();
  if (!trimmed) return null;
  return hashSource(trimmed);
}

export function getUniversityTranslationStatus(
  row: UniversitySourceRow,
  contentAr: UniversityContentAr,
  meta: UniversityContentArMeta | null,
): UniversityTranslationStatus {
  const hasAnyArabic = Object.keys(contentAr).length > 0;
  if (!hasAnyArabic || !meta) return "not_translated";

  const currentFields = buildTranslatableUniversityFields(row);
  const documentLines = getUniversityDocumentLines(row);

  for (const field of currentFields) {
    const storedHash = meta.field_hashes[field.key];
    if (!storedHash || storedHash !== field.sourceHash) {
      return "outdated";
    }
  }

  if (documentLines.length > 0) {
    const documentsHash = universityDocumentsSourceHash(documentLines);
    const storedDocumentsHash = meta.field_hashes.documents;
    if (!storedDocumentsHash || storedDocumentsHash !== documentsHash) {
      return "outdated";
    }
  }

  const intakesHash = universityIntakesSourceHash(row.intakes);
  if (intakesHash) {
    const storedIntakesHash = meta.field_hashes.intakes;
    if (!storedIntakesHash || storedIntakesHash !== intakesHash) {
      return "outdated";
    }
  }

  const cityHash = universityCitySourceHash(row.city);
  if (cityHash) {
    const storedCityHash = meta.field_hashes.city;
    if (!storedCityHash || storedCityHash !== cityHash) {
      return "outdated";
    }
  }

  const countryHash = universityCountrySourceHash(row.country_code);
  if (countryHash) {
    const storedCountryHash = meta.field_hashes.country_name;
    if (!storedCountryHash || storedCountryHash !== countryHash) {
      return "outdated";
    }
  }

  return "up_to_date";
}

export function serializeUniversityContentAr(content: UniversityContentAr): Json {
  return content as Json;
}

export function serializeUniversityContentArMeta(meta: UniversityContentArMeta): Json {
  return meta as Json;
}

export { SCHOLARSHIP_NOTE_EN };
