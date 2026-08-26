import type { Json } from "@/database.types";
import { createHash } from "crypto";

/** Scalar keys stored in scholarships.content_ar */
export type ScholarshipContentArScalarKey =
  | "name"
  | "provider"
  | "country"
  | "type"
  | "shortSummary"
  | "eligSummary"
  | "degreeLevels"
  | "fieldsOfStudy"
  | "academicElig"
  | "englishReq"
  | "otherElig"
  | "applicationMethod"
  | "coverageLabel"
  | "tooltip"
  | "competition"
  | "renewable"
  | "deadline"
  | "linkNotes"
  | "applicationWebsiteName"
  | "importantNotes"
  | "coverage_tuition"
  | "coverage_stipend"
  | "coverage_travel"
  | "coverage_other"
  | "description"
  | "target_students"
  | "level"
  | "sat_policy"
  | "method"
  | "intakes"
  | "city"
  | "other";

export type ScholarshipContentArKey =
  | ScholarshipContentArScalarKey
  | "requiredDocs"
  | "destinations";

export type ScholarshipContentAr = Partial<
  Record<ScholarshipContentArScalarKey, string>
> & {
  requiredDocs?: string[];
  destinations?: string[];
};

export type ScholarshipContentArMeta = {
  translated_at: string;
  field_hashes: Partial<Record<ScholarshipContentArKey, string>>;
};

export type ScholarshipTranslationStatus = "not_translated" | "up_to_date" | "outdated";

export type ScholarshipSourceRow = {
  name: string;
  nationality_country_code: string | null;
  description: string | null;
  target_students: string | null;
  level: string | null;
  fields: Json | null;
  coverage: string | null;
  competition: string | null;
  tuition: string | null;
  travel: string | null;
  living_stipend: string | null;
  other_benefits: string | null;
  city: string | null;
  academic_eligibility: string | null;
  sat_policy: string | null;
  documents: Json | null;
  deadline: string | null;
  method: string | null;
  tooltip: string | null;
  other: string | null;
  intakes: string | null;
  is_renewable: boolean;
  type: string | null;
  discovery_payload: Json | null;
};

/** Modal detail keys (SAT/ACT + coverage notes) — translated separately from main body */
export const SCHOLARSHIP_MODAL_CONTENT_AR_KEYS = ["sat_policy", "tooltip"] as const;
export type ScholarshipModalContentArKey = (typeof SCHOLARSHIP_MODAL_CONTENT_AR_KEYS)[number];

export type ScholarshipModalSourceRow = Pick<
  ScholarshipSourceRow,
  "sat_policy" | "tooltip" | "discovery_payload"
>;

export type TranslatableScholarshipField = {
  key: ScholarshipContentArScalarKey;
  sourceText: string;
  sourceHash: string;
};

function hashSource(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function stringFromJson(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim())
      .filter(Boolean)
      .join(", ");
  }
  return "";
}

function stringArrayFromJson(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean);
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

function formatTypeLabel(type: string | null | undefined): string {
  const t = String(type ?? "")
    .trim()
    .toLowerCase();
  if (!t) return "Other";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function formatCompetitionLabel(competition: string | null | undefined): string {
  if (!competition?.trim()) return "Medium";
  return String(competition)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatFieldsColumn(fields: Json | null): string {
  return stringFromJson(fields);
}

function payloadRecord(payload: Json | null): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  return payload as Record<string, unknown>;
}

function coverageDetailsFromPayload(payload: Record<string, unknown>) {
  const details = payload.coverageDetails;
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return { tuition: "", stipend: "", travel: "", other: "" };
  }
  const d = details as Record<string, unknown>;
  return {
    tuition: typeof d.tuition === "string" ? d.tuition.trim() : "",
    stipend: typeof d.stipend === "string" ? d.stipend.trim() : "",
    travel: typeof d.travel === "string" ? d.travel.trim() : "",
    other: typeof d.other === "string" ? d.other.trim() : "",
  };
}

export function parseScholarshipContentAr(raw: Json | null | undefined): ScholarshipContentAr {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const out: ScholarshipContentAr = {};

  const stringKeys: ScholarshipContentArScalarKey[] = [
    "name",
    "provider",
    "country",
    "type",
    "shortSummary",
    "eligSummary",
    "degreeLevels",
    "fieldsOfStudy",
    "academicElig",
    "englishReq",
    "otherElig",
    "applicationMethod",
    "coverageLabel",
    "tooltip",
    "competition",
    "renewable",
    "deadline",
    "linkNotes",
    "applicationWebsiteName",
    "importantNotes",
    "coverage_tuition",
    "coverage_stipend",
    "coverage_travel",
    "coverage_other",
    "description",
    "target_students",
    "level",
    "sat_policy",
    "method",
    "intakes",
    "city",
    "other",
  ];

  for (const key of stringKeys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim();
    }
  }

  const docs = obj.requiredDocs;
  if (Array.isArray(docs)) {
    const parsed = docs.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    if (parsed.length > 0) out.requiredDocs = parsed;
  }

  const destinations = obj.destinations;
  if (Array.isArray(destinations)) {
    const parsed = destinations.filter(
      (x): x is string => typeof x === "string" && x.trim().length > 0,
    );
    if (parsed.length > 0) out.destinations = parsed;
  }

  return out;
}

export function parseScholarshipContentArMeta(
  raw: Json | null | undefined,
): ScholarshipContentArMeta | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const translatedAt =
    typeof obj.translated_at === "string" && obj.translated_at.trim()
      ? obj.translated_at.trim()
      : null;
  if (!translatedAt) return null;

  const fieldHashesRaw = obj.field_hashes;
  const field_hashes: Partial<Record<ScholarshipContentArKey, string>> = {};
  if (fieldHashesRaw && typeof fieldHashesRaw === "object" && !Array.isArray(fieldHashesRaw)) {
    for (const [key, value] of Object.entries(fieldHashesRaw)) {
      if (typeof value === "string" && value.trim()) {
        field_hashes[key as ScholarshipContentArKey] = value.trim();
      }
    }
  }

  return { translated_at: translatedAt, field_hashes };
}

export function buildTranslatableScholarshipFields(
  row: ScholarshipSourceRow,
): TranslatableScholarshipField[] {
  const fields: TranslatableScholarshipField[] = [];

  function addStringField(key: ScholarshipContentArScalarKey, sourceText: string) {
    const trimmed = sourceText.trim();
    if (!trimmed) return;
    fields.push({ key, sourceText: trimmed, sourceHash: hashSource(trimmed) });
  }

  const payload = payloadRecord(row.discovery_payload);

  if (payload) {
    addStringField("name", typeof payload.name === "string" ? payload.name : row.name);
    addStringField("provider", typeof payload.provider === "string" ? payload.provider : "");
    addStringField("country", typeof payload.country === "string" ? payload.country : "");
    addStringField("type", typeof payload.type === "string" ? payload.type : "");
    addStringField(
      "shortSummary",
      typeof payload.shortSummary === "string" ? payload.shortSummary : "",
    );
    addStringField("eligSummary", typeof payload.eligSummary === "string" ? payload.eligSummary : "");
    addStringField(
      "degreeLevels",
      typeof payload.degreeLevels === "string" ? payload.degreeLevels : "",
    );
    addStringField(
      "fieldsOfStudy",
      typeof payload.fieldsOfStudy === "string" ? payload.fieldsOfStudy : "",
    );
    addStringField(
      "academicElig",
      typeof payload.academicElig === "string" ? payload.academicElig : "",
    );
    addStringField("englishReq", typeof payload.englishReq === "string" ? payload.englishReq : "");
    addStringField("otherElig", typeof payload.otherElig === "string" ? payload.otherElig : "");
    addStringField(
      "applicationMethod",
      typeof payload.applicationMethod === "string" ? payload.applicationMethod : "",
    );
    addStringField(
      "coverageLabel",
      typeof payload.coverageLabel === "string" ? payload.coverageLabel : "",
    );
    addStringField("tooltip", resolveScholarshipTooltip(row));
    addStringField(
      "competition",
      typeof payload.competition === "string" ? payload.competition : "",
    );
    addStringField("renewable", typeof payload.renewable === "string" ? payload.renewable : "");
    addStringField("deadline", typeof payload.deadline === "string" ? payload.deadline : "");
    addStringField("linkNotes", typeof payload.linkNotes === "string" ? payload.linkNotes : "");
    addStringField(
      "applicationWebsiteName",
      typeof payload.applicationWebsiteName === "string" ? payload.applicationWebsiteName : "",
    );
    addStringField(
      "importantNotes",
      typeof payload.importantNotes === "string" ? payload.importantNotes : "",
    );

    // SAT/ACT always comes from the DB column on the student detail modal
    addStringField("sat_policy", row.sat_policy ?? "");

    const coverage = coverageDetailsFromPayload(payload);
    addStringField("coverage_tuition", coverage.tuition);
    addStringField("coverage_stipend", coverage.stipend);
    addStringField("coverage_travel", coverage.travel);
    addStringField("coverage_other", coverage.other);
  } else {
    addStringField("name", row.name);
    addStringField("description", row.description ?? "");
    addStringField("target_students", row.target_students ?? "");
    addStringField("level", row.level ?? "");
    addStringField("fieldsOfStudy", formatFieldsColumn(row.fields));
    addStringField("coverageLabel", row.coverage ?? "");
    addStringField("competition", formatCompetitionLabel(row.competition));
    addStringField("coverage_tuition", row.tuition ?? "");
    addStringField("coverage_stipend", row.living_stipend ?? "");
    addStringField("coverage_travel", row.travel ?? "");
    addStringField("coverage_other", row.other_benefits ?? "");
    addStringField("city", row.city ?? "");
    addStringField("academicElig", row.academic_eligibility ?? "");
    addStringField("sat_policy", row.sat_policy ?? "");
    addStringField("applicationMethod", row.method ?? "");
    addStringField("tooltip", resolveScholarshipTooltip(row));
    addStringField("deadline", row.deadline ?? "");
    addStringField("otherElig", row.other ?? "");
    addStringField("type", formatTypeLabel(row.type));
    addStringField("renewable", row.is_renewable ? "Yes" : "No");
    addStringField("eligSummary", row.target_students ?? "");
    addStringField("shortSummary", row.description ?? "");
    addStringField("degreeLevels", row.level ?? "");
  }

  return fields;
}

/** Tooltip shown in the modal: DB column wins over discovery_payload (matches student UI). */
export function resolveScholarshipTooltip(row: ScholarshipModalSourceRow): string {
  const fromColumn = row.tooltip?.trim();
  if (fromColumn) return fromColumn;

  const payload = payloadRecord(row.discovery_payload);
  if (payload && typeof payload.tooltip === "string") {
    return payload.tooltip.trim();
  }
  return "";
}

export function resolveScholarshipSatPolicy(row: ScholarshipModalSourceRow): string {
  return row.sat_policy?.trim() ?? "";
}

export function buildScholarshipModalFields(
  row: ScholarshipModalSourceRow,
): { key: ScholarshipModalContentArKey; sourceText: string; sourceHash: string }[] {
  const fields: { key: ScholarshipModalContentArKey; sourceText: string; sourceHash: string }[] =
    [];

  function add(key: ScholarshipModalContentArKey, sourceText: string) {
    const trimmed = sourceText.trim();
    if (!trimmed) return;
    fields.push({ key, sourceText: trimmed, sourceHash: hashSource(trimmed) });
  }

  add("sat_policy", resolveScholarshipSatPolicy(row));
  add("tooltip", resolveScholarshipTooltip(row));

  return fields;
}

export function getScholarshipModalTranslationStatus(
  row: ScholarshipModalSourceRow,
  contentAr: ScholarshipContentAr,
  meta: ScholarshipContentArMeta | null,
): ScholarshipTranslationStatus {
  const fields = buildScholarshipModalFields(row);
  if (fields.length === 0) return "up_to_date";

  const hasAnyModalAr = fields.some((field) => Boolean(contentAr[field.key]?.trim()));
  if (!hasAnyModalAr || !meta) return "not_translated";

  for (const field of fields) {
    const storedHash = meta.field_hashes[field.key];
    if (!storedHash || storedHash !== field.sourceHash) {
      return "outdated";
    }
  }

  return "up_to_date";
}

export function getScholarshipDocumentLines(row: ScholarshipSourceRow): string[] {
  const payload = payloadRecord(row.discovery_payload);
  if (payload && Array.isArray(payload.requiredDocs)) {
    return stringArrayFromJson(payload.requiredDocs);
  }
  return documentsFromJson(row.documents)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function getScholarshipDestinationLines(row: ScholarshipSourceRow): string[] {
  const payload = payloadRecord(row.discovery_payload);
  if (payload && Array.isArray(payload.destinations)) {
    return stringArrayFromJson(payload.destinations);
  }
  return [];
}

export function scholarshipDocumentsSourceHash(lines: string[]): string {
  return hashSource(lines.join("\n"));
}

export function scholarshipDestinationsSourceHash(lines: string[]): string {
  return hashSource(lines.join("\n"));
}

export function scholarshipIntakesSourceHash(intakes: string | null | undefined): string | null {
  const trimmed = intakes?.trim();
  if (!trimmed) return null;
  return hashSource(trimmed);
}

export function scholarshipCountrySourceHash(
  countryCode: string | null | undefined,
): string | null {
  const trimmed = countryCode?.trim().toUpperCase();
  if (!trimmed) return null;
  return hashSource(trimmed);
}

export function getScholarshipTranslationStatus(
  row: ScholarshipSourceRow,
  contentAr: ScholarshipContentAr,
  meta: ScholarshipContentArMeta | null,
): ScholarshipTranslationStatus {
  const hasAnyArabic = Object.keys(contentAr).length > 0;
  if (!hasAnyArabic || !meta) return "not_translated";

  const currentFields = buildTranslatableScholarshipFields(row);
  const documentLines = getScholarshipDocumentLines(row);
  const destinationLines = getScholarshipDestinationLines(row);

  for (const field of currentFields) {
    const storedHash = meta.field_hashes[field.key];
    if (!storedHash || storedHash !== field.sourceHash) {
      return "outdated";
    }
  }

  if (documentLines.length > 0) {
    const documentsHash = scholarshipDocumentsSourceHash(documentLines);
    const storedDocumentsHash = meta.field_hashes.requiredDocs;
    if (!storedDocumentsHash || storedDocumentsHash !== documentsHash) {
      return "outdated";
    }
  }

  if (destinationLines.length > 0) {
    const destinationsHash = scholarshipDestinationsSourceHash(destinationLines);
    const storedDestinationsHash = meta.field_hashes.destinations;
    if (!storedDestinationsHash || storedDestinationsHash !== destinationsHash) {
      return "outdated";
    }
  }

  const intakesHash = scholarshipIntakesSourceHash(row.intakes);
  if (intakesHash) {
    const storedIntakesHash = meta.field_hashes.intakes;
    if (!storedIntakesHash || storedIntakesHash !== intakesHash) {
      return "outdated";
    }
  }

  const countryHash = scholarshipCountrySourceHash(row.nationality_country_code);
  if (countryHash) {
    const storedCountryHash = meta.field_hashes.country;
    if (!storedCountryHash || storedCountryHash !== countryHash) {
      return "outdated";
    }
  }

  return "up_to_date";
}

export function serializeScholarshipContentAr(content: ScholarshipContentAr): Json {
  return content as Json;
}

export function serializeScholarshipContentArMeta(meta: ScholarshipContentArMeta): Json {
  return meta as Json;
}

export function destinationsFieldValue(lines: string[]): string {
  return lines.join("\n");
}

export function destinationsFromFieldValue(value: string): string[] {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}
