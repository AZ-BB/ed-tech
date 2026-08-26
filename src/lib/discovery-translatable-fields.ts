import type { Json } from "@/database.types";
import type {
  CombinedProfileConfig,
  DiscoveryModuleConfig,
  DiscoveryModuleProfile,
  DiscoveryQuestion,
  DiscoveryScales,
  ScaleId,
} from "@/types/discovery";
import { createHash } from "crypto";

export type DiscoveryTranslationStatus = "not_translated" | "up_to_date" | "outdated";

export type DiscoveryModuleContentAr = {
  title?: string;
  subtitle?: string;
  description?: string;
  categories?: string[];
  questions?: Record<
    string,
    {
      text?: string;
      optionA?: { label?: string };
      optionB?: { label?: string };
      options?: Array<{ label?: string }>;
    }
  >;
  profiles?: Record<
    string,
    {
      title?: string;
      majors_strong?: string[];
      majors_related?: string[];
      majors_stretch?: string[];
      careers?: string[];
    }
  >;
};

export type DiscoverySettingsContentAr = {
  scales?: Partial<Record<ScaleId, Record<string, { label?: string }>>>;
  combined_profiles?: Record<string, { title?: string; summary?: string }>;
};

export type DiscoveryContentArMeta = {
  translated_at: string;
  field_hashes: Record<string, string>;
};

export type TranslatableDiscoveryField = {
  key: string;
  sourceText: string;
  sourceHash: string;
};

export type DiscoveryModuleSourceRow = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  content_json: Json;
};

export type DiscoverySettingsSourceRow = {
  scales_json: Json;
  combined_profiles_json: Json;
};

function hashSource(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function hashLines(lines: string[]): string {
  return hashSource(lines.join("\n"));
}

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function parseModuleContentJson(raw: Json): {
  categories: string[];
  questions: DiscoveryQuestion[];
  profiles: DiscoveryModuleProfile[];
} {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { categories: [], questions: [], profiles: [] };
  }
  const obj = raw as Record<string, unknown>;
  return {
    categories: parseStringArray(obj.categories),
    questions: Array.isArray(obj.questions)
      ? (obj.questions as DiscoveryQuestion[])
      : [],
    profiles: Array.isArray(obj.profiles)
      ? (obj.profiles as DiscoveryModuleProfile[])
      : [],
  };
}

export function moduleConfigFromSourceRow(row: DiscoveryModuleSourceRow): DiscoveryModuleConfig {
  const content = parseModuleContentJson(row.content_json);
  return {
    moduleId: row.id,
    title: row.title,
    number: "",
    subtitle: row.subtitle,
    description: row.description,
    answerFormat: "interest",
    numItems: content.questions.length,
    isActive: true,
    sortOrder: 0,
    categories: content.categories,
    questions: content.questions,
    profiles: content.profiles,
  };
}

export function parseDiscoveryModuleContentAr(
  raw: Json | null | undefined,
): DiscoveryModuleContentAr {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const out: DiscoveryModuleContentAr = {};

  if (typeof obj.title === "string" && obj.title.trim()) out.title = obj.title.trim();
  if (typeof obj.subtitle === "string" && obj.subtitle.trim()) out.subtitle = obj.subtitle.trim();
  if (typeof obj.description === "string" && obj.description.trim()) {
    out.description = obj.description.trim();
  }

  const categories = parseStringArray(obj.categories);
  if (categories.length > 0) out.categories = categories;

  if (obj.questions && typeof obj.questions === "object" && !Array.isArray(obj.questions)) {
    const questions: NonNullable<DiscoveryModuleContentAr["questions"]> = {};
    for (const [itemId, value] of Object.entries(obj.questions)) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const q = value as Record<string, unknown>;
      const entry: NonNullable<DiscoveryModuleContentAr["questions"]>[string] = {};
      if (typeof q.text === "string" && q.text.trim()) entry.text = q.text.trim();

      for (const optKey of ["optionA", "optionB"] as const) {
        const optRaw = q[optKey];
        if (optRaw && typeof optRaw === "object" && !Array.isArray(optRaw)) {
          const label = (optRaw as { label?: unknown }).label;
          if (typeof label === "string" && label.trim()) {
            entry[optKey] = { label: label.trim() };
          }
        }
      }

      if (Array.isArray(q.options)) {
        const options = q.options
          .map((opt) => {
            if (!opt || typeof opt !== "object" || Array.isArray(opt)) return null;
            const label = (opt as { label?: unknown }).label;
            return typeof label === "string" && label.trim() ? { label: label.trim() } : null;
          })
          .filter((x): x is { label: string } => x != null);
        if (options.length > 0) entry.options = options;
      }

      if (Object.keys(entry).length > 0) questions[itemId] = entry;
    }
    if (Object.keys(questions).length > 0) out.questions = questions;
  }

  if (obj.profiles && typeof obj.profiles === "object" && !Array.isArray(obj.profiles)) {
    const profiles: NonNullable<DiscoveryModuleContentAr["profiles"]> = {};
    for (const [profileId, value] of Object.entries(obj.profiles)) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const p = value as Record<string, unknown>;
      const entry: NonNullable<DiscoveryModuleContentAr["profiles"]>[string] = {};
      if (typeof p.title === "string" && p.title.trim()) entry.title = p.title.trim();
      for (const listKey of [
        "majors_strong",
        "majors_related",
        "majors_stretch",
        "careers",
      ] as const) {
        const list = parseStringArray(p[listKey]);
        if (list.length > 0) entry[listKey] = list;
      }
      if (Object.keys(entry).length > 0) profiles[profileId] = entry;
    }
    if (Object.keys(profiles).length > 0) out.profiles = profiles;
  }

  return out;
}

export function parseDiscoverySettingsContentAr(
  raw: Json | null | undefined,
): DiscoverySettingsContentAr {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const out: DiscoverySettingsContentAr = {};

  if (obj.scales && typeof obj.scales === "object" && !Array.isArray(obj.scales)) {
    const scales: NonNullable<DiscoverySettingsContentAr["scales"]> = {};
    for (const [scaleId, scaleRaw] of Object.entries(obj.scales)) {
      if (!scaleRaw || typeof scaleRaw !== "object" || Array.isArray(scaleRaw)) continue;
      const valueMap: Record<string, { label?: string }> = {};
      for (const [valueKey, optRaw] of Object.entries(scaleRaw)) {
        if (!optRaw || typeof optRaw !== "object" || Array.isArray(optRaw)) continue;
        const label = (optRaw as { label?: unknown }).label;
        if (typeof label === "string" && label.trim()) {
          valueMap[valueKey] = { label: label.trim() };
        }
      }
      if (Object.keys(valueMap).length > 0) {
        scales[scaleId as ScaleId] = valueMap;
      }
    }
    if (Object.keys(scales).length > 0) out.scales = scales;
  }

  if (
    obj.combined_profiles &&
    typeof obj.combined_profiles === "object" &&
    !Array.isArray(obj.combined_profiles)
  ) {
    const combined: NonNullable<DiscoverySettingsContentAr["combined_profiles"]> = {};
    for (const [profileId, profileRaw] of Object.entries(obj.combined_profiles)) {
      if (!profileRaw || typeof profileRaw !== "object" || Array.isArray(profileRaw)) continue;
      const p = profileRaw as Record<string, unknown>;
      const entry: { title?: string; summary?: string } = {};
      if (typeof p.title === "string" && p.title.trim()) entry.title = p.title.trim();
      if (typeof p.summary === "string" && p.summary.trim()) entry.summary = p.summary.trim();
      if (Object.keys(entry).length > 0) combined[profileId] = entry;
    }
    if (Object.keys(combined).length > 0) out.combined_profiles = combined;
  }

  return out;
}

export function parseDiscoveryContentArMeta(
  raw: Json | null | undefined,
): DiscoveryContentArMeta | null {
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

function addStringField(
  fields: TranslatableDiscoveryField[],
  key: string,
  sourceText: string,
) {
  const trimmed = sourceText.trim();
  if (!trimmed) return;
  fields.push({ key, sourceText: trimmed, sourceHash: hashSource(trimmed) });
}

function addLinesField(
  fields: TranslatableDiscoveryField[],
  key: string,
  lines: string[],
) {
  const filtered = lines.map((l) => l.trim()).filter(Boolean);
  if (filtered.length === 0) return;
  fields.push({ key, sourceText: filtered.join("\n"), sourceHash: hashLines(filtered) });
}

export function buildTranslatableDiscoveryModuleFields(
  row: DiscoveryModuleSourceRow,
): TranslatableDiscoveryField[] {
  const fields: TranslatableDiscoveryField[] = [];
  const content = parseModuleContentJson(row.content_json);

  addStringField(fields, "title", row.title);
  addStringField(fields, "subtitle", row.subtitle ?? "");
  addStringField(fields, "description", row.description ?? "");
  addLinesField(fields, "categories", content.categories);

  for (const question of content.questions) {
    const itemId = question.item_id?.trim();
    if (!itemId) continue;
    addStringField(fields, `questions.${itemId}.text`, question.text);

    if (question.response_type === "forced_choice") {
      addStringField(fields, `questions.${itemId}.optionA.label`, question.optionA.label);
      addStringField(fields, `questions.${itemId}.optionB.label`, question.optionB.label);
    } else if (question.response_type === "scenario_select") {
      question.options.forEach((opt, index) => {
        addStringField(fields, `questions.${itemId}.options.${index}.label`, opt.label);
      });
    }
  }

  for (const profile of content.profiles) {
    const profileId = profile.profile_id?.trim();
    if (!profileId) continue;
    addStringField(fields, `profiles.${profileId}.title`, profile.title);
    addLinesField(fields, `profiles.${profileId}.majors_strong`, profile.majors_strong);
    addLinesField(fields, `profiles.${profileId}.majors_related`, profile.majors_related);
    addLinesField(fields, `profiles.${profileId}.majors_stretch`, profile.majors_stretch);
    addLinesField(fields, `profiles.${profileId}.careers`, profile.careers);
  }

  return fields;
}

export function buildTranslatableDiscoverySettingsFields(
  row: DiscoverySettingsSourceRow,
): TranslatableDiscoveryField[] {
  const fields: TranslatableDiscoveryField[] = [];

  // Scale option labels use static Arabic maps — see translate-discovery-scale-labels.ts

  const combined = Array.isArray(row.combined_profiles_json)
    ? (row.combined_profiles_json as CombinedProfileConfig[])
    : [];
  for (const profile of combined) {
    const profileId = profile.profile_id?.trim();
    if (!profileId) continue;
    addStringField(fields, `combined_profiles.${profileId}.title`, profile.title);
    addStringField(fields, `combined_profiles.${profileId}.summary`, profile.summary);
  }

  return fields;
}

function hasAnyModuleArabic(contentAr: DiscoveryModuleContentAr): boolean {
  if (contentAr.title || contentAr.subtitle || contentAr.description) return true;
  if (contentAr.categories && contentAr.categories.length > 0) return true;
  if (contentAr.questions && Object.keys(contentAr.questions).length > 0) return true;
  if (contentAr.profiles && Object.keys(contentAr.profiles).length > 0) return true;
  return false;
}

function hasAnySettingsArabic(contentAr: DiscoverySettingsContentAr): boolean {
  if (contentAr.scales && Object.keys(contentAr.scales).length > 0) return true;
  if (contentAr.combined_profiles && Object.keys(contentAr.combined_profiles).length > 0) {
    return true;
  }
  return false;
}

export function getDiscoveryModuleTranslationStatus(
  row: DiscoveryModuleSourceRow,
  contentAr: DiscoveryModuleContentAr,
  meta: DiscoveryContentArMeta | null,
): DiscoveryTranslationStatus {
  if (!hasAnyModuleArabic(contentAr) || !meta) return "not_translated";

  const currentFields = buildTranslatableDiscoveryModuleFields(row);
  for (const field of currentFields) {
    const storedHash = meta.field_hashes[field.key];
    if (!storedHash || storedHash !== field.sourceHash) {
      return "outdated";
    }
  }

  return "up_to_date";
}

export function getDiscoverySettingsTranslationStatus(
  row: DiscoverySettingsSourceRow,
  contentAr: DiscoverySettingsContentAr,
  meta: DiscoveryContentArMeta | null,
): DiscoveryTranslationStatus {
  if (!hasAnySettingsArabic(contentAr) || !meta) return "not_translated";

  const currentFields = buildTranslatableDiscoverySettingsFields(row);
  for (const field of currentFields) {
    const storedHash = meta.field_hashes[field.key];
    if (!storedHash || storedHash !== field.sourceHash) {
      return "outdated";
    }
  }

  return "up_to_date";
}

export function applyFlatTranslationsToModuleContentAr(
  existing: DiscoveryModuleContentAr,
  translations: Record<string, string>,
): DiscoveryModuleContentAr {
  const next: DiscoveryModuleContentAr = { ...existing };

  if (translations.title) next.title = translations.title;
  if (translations.subtitle) next.subtitle = translations.subtitle;
  if (translations.description) next.description = translations.description;
  if (translations.categories) {
    next.categories = translations.categories.split("\n").map((l) => l.trim()).filter(Boolean);
  }

  if (!next.questions) next.questions = { ...(existing.questions ?? {}) };
  if (!next.profiles) next.profiles = { ...(existing.profiles ?? {}) };

  for (const [key, value] of Object.entries(translations)) {
    if (!value.trim()) continue;

    const questionTextMatch = key.match(/^questions\.([^.]+)\.text$/);
    if (questionTextMatch) {
      const itemId = questionTextMatch[1];
      next.questions![itemId] = { ...next.questions![itemId], text: value };
      continue;
    }

    const optionMatch = key.match(/^questions\.([^.]+)\.(optionA|optionB)\.label$/);
    if (optionMatch) {
      const [, itemId, optKey] = optionMatch;
      const prev = next.questions![itemId] ?? {};
      next.questions![itemId] = {
        ...prev,
        [optKey]: { label: value },
      };
      continue;
    }

    const scenarioMatch = key.match(/^questions\.([^.]+)\.options\.(\d+)\.label$/);
    if (scenarioMatch) {
      const [, itemId, indexStr] = scenarioMatch;
      const index = Number.parseInt(indexStr, 10);
      const prev = next.questions![itemId] ?? {};
      const options = [...(prev.options ?? [])];
      while (options.length <= index) options.push({ label: "" });
      options[index] = { label: value };
      next.questions![itemId] = { ...prev, options };
      continue;
    }

    const profileTitleMatch = key.match(/^profiles\.([^.]+)\.title$/);
    if (profileTitleMatch) {
      const profileId = profileTitleMatch[1];
      next.profiles![profileId] = { ...next.profiles![profileId], title: value };
      continue;
    }

    for (const listKey of ["majors_strong", "majors_related", "majors_stretch", "careers"] as const) {
      const listMatch = key.match(new RegExp(`^profiles\\.([^.]+)\\.${listKey}$`));
      if (listMatch) {
        const profileId = listMatch[1];
        next.profiles![profileId] = {
          ...next.profiles![profileId],
          [listKey]: value.split("\n").map((l) => l.trim()).filter(Boolean),
        };
        break;
      }
    }
  }

  return next;
}

export function applyFlatTranslationsToSettingsContentAr(
  existing: DiscoverySettingsContentAr,
  translations: Record<string, string>,
): DiscoverySettingsContentAr {
  const next: DiscoverySettingsContentAr = {
    scales: { ...(existing.scales ?? {}) },
    combined_profiles: { ...(existing.combined_profiles ?? {}) },
  };

  for (const [key, value] of Object.entries(translations)) {
    if (!value.trim()) continue;

    const scaleMatch = key.match(/^scales\.([^.]+)\.(\d+)\.label$/);
    if (scaleMatch) {
      const [, scaleId, valueKey] = scaleMatch;
      if (!next.scales![scaleId as ScaleId]) next.scales![scaleId as ScaleId] = {};
      next.scales![scaleId as ScaleId]![valueKey] = { label: value };
      continue;
    }

    const titleMatch = key.match(/^combined_profiles\.([^.]+)\.title$/);
    if (titleMatch) {
      const profileId = titleMatch[1];
      next.combined_profiles![profileId] = {
        ...next.combined_profiles![profileId],
        title: value,
      };
      continue;
    }

    const summaryMatch = key.match(/^combined_profiles\.([^.]+)\.summary$/);
    if (summaryMatch) {
      const profileId = summaryMatch[1];
      next.combined_profiles![profileId] = {
        ...next.combined_profiles![profileId],
        summary: value,
      };
    }
  }

  return next;
}

export function sanitizeDiscoveryModuleContentAr(
  input: DiscoveryModuleContentAr,
): DiscoveryModuleContentAr {
  return parseDiscoveryModuleContentAr(input as unknown as Json);
}

export function sanitizeDiscoverySettingsContentAr(
  input: DiscoverySettingsContentAr,
): DiscoverySettingsContentAr {
  return parseDiscoverySettingsContentAr(input as unknown as Json);
}

export function serializeDiscoveryModuleContentAr(content: DiscoveryModuleContentAr): Json {
  return content as Json;
}

export function serializeDiscoverySettingsContentAr(content: DiscoverySettingsContentAr): Json {
  return content as Json;
}

export function serializeDiscoveryContentArMeta(meta: DiscoveryContentArMeta): Json {
  return meta as Json;
}

export const DISCOVERY_TRANSLATION_CHUNK_SIZE = 40;

export function chunkTranslatableFields(
  fields: TranslatableDiscoveryField[],
  chunkSize = DISCOVERY_TRANSLATION_CHUNK_SIZE,
): TranslatableDiscoveryField[][] {
  const chunks: TranslatableDiscoveryField[][] = [];
  for (let i = 0; i < fields.length; i += chunkSize) {
    chunks.push(fields.slice(i, i + chunkSize));
  }
  return chunks;
}
