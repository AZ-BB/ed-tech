import type { Json } from "@/database.types";
import type {
  ProgramCareerExample,
  ProgramCareerPath,
  ProgramCoreSkill,
  ProgramDayInLife,
  ProgramEmployer,
  ProgramSalaryRegion,
  ProgramsDiscoveryRow,
  ProgramStudyPlanYear,
  ProgramVideo,
} from "@/lib/programs-discovery-types";
import { parseJsonArray } from "@/lib/programs-discovery-types";
import { createHash } from "crypto";

export type ProgramDiscoveryTranslationStatus =
  | "not_translated"
  | "up_to_date"
  | "outdated";

export type ProgramDiscoveryContentAr = {
  title?: string;
  category?: string;
  short_description?: string;
  description?: string;
  salary_potential?: string;
  demand_level?: string;
  math_intensity?: string;
  ai_resilience?: string;
  tags?: string[];
  career_paths?: ProgramCareerPath[];
  core_skills?: ProgramCoreSkill[];
  study_plan?: ProgramStudyPlanYear[];
  day_in_life?: ProgramDayInLife[];
  salary_regions?: ProgramSalaryRegion[];
  career_examples?: ProgramCareerExample[];
  employers?: ProgramEmployer[];
  videos?: Array<Omit<ProgramVideo, "youtube_id"> & { youtube_id?: string }>;
};

export type ProgramDiscoveryContentArMeta = {
  translated_at: string;
  field_hashes: Record<string, string>;
};

export type TranslatableProgramDiscoveryField = {
  key: string;
  sourceText: string;
  sourceHash: string;
};

export type ProgramDiscoverySourceRow = Pick<
  ProgramsDiscoveryRow,
  | "title"
  | "category"
  | "short_description"
  | "description"
  | "tags"
  | "salary_potential"
  | "demand_level"
  | "math_intensity"
  | "ai_resilience"
  | "career_paths"
  | "core_skills"
  | "study_plan"
  | "day_in_life"
  | "salary_regions"
  | "career_examples"
  | "employers"
  | "videos"
>;

export const PROGRAM_DISCOVERY_TRANSLATION_CHUNK_SIZE = 20;

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

function addStringField(
  fields: TranslatableProgramDiscoveryField[],
  key: string,
  sourceText: string,
) {
  const trimmed = sourceText.trim();
  if (!trimmed) return;
  fields.push({ key, sourceText: trimmed, sourceHash: hashSource(trimmed) });
}

function addLinesField(
  fields: TranslatableProgramDiscoveryField[],
  key: string,
  lines: string[],
) {
  const filtered = lines.map((line) => line.trim()).filter(Boolean);
  if (filtered.length === 0) return;
  fields.push({ key, sourceText: filtered.join("\n"), sourceHash: hashLines(filtered) });
}

export function parseProgramDiscoveryContentAr(
  raw: Json | null | undefined,
): ProgramDiscoveryContentAr {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const out: ProgramDiscoveryContentAr = {};

  for (const key of [
    "title",
    "category",
    "short_description",
    "description",
    "salary_potential",
    "demand_level",
    "math_intensity",
    "ai_resilience",
  ] as const) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim();
    }
  }

  const tags = parseStringArray(obj.tags);
  if (tags.length > 0) out.tags = tags;

  const jsonKeys = [
    "career_paths",
    "core_skills",
    "study_plan",
    "day_in_life",
    "salary_regions",
    "career_examples",
    "employers",
    "videos",
  ] as const;

  for (const key of jsonKeys) {
    const parsed = parseJsonArray<unknown>(obj[key]);
    if (parsed.length > 0) {
      (out as Record<string, unknown>)[key] = parsed;
    }
  }

  return out;
}

export function parseProgramDiscoveryContentArMeta(
  raw: Json | null | undefined,
): ProgramDiscoveryContentArMeta | null {
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

export function serializeProgramDiscoveryContentAr(
  content: ProgramDiscoveryContentAr,
): Json {
  return content as Json;
}

export function serializeProgramDiscoveryContentArMeta(
  meta: ProgramDiscoveryContentArMeta,
): Json {
  return meta as Json;
}

export function buildTranslatableProgramDiscoveryFields(
  row: ProgramDiscoverySourceRow,
): TranslatableProgramDiscoveryField[] {
  const fields: TranslatableProgramDiscoveryField[] = [];

  addStringField(fields, "title", row.title);
  addStringField(fields, "category", row.category);
  addStringField(fields, "short_description", row.short_description ?? "");
  addStringField(fields, "description", row.description ?? "");
  addStringField(fields, "salary_potential", row.salary_potential ?? "");
  addStringField(fields, "demand_level", row.demand_level ?? "");
  addStringField(fields, "math_intensity", row.math_intensity ?? "");
  addStringField(fields, "ai_resilience", row.ai_resilience ?? "");
  addLinesField(fields, "tags", row.tags ?? []);

  const careerPaths = parseJsonArray<ProgramCareerPath>(row.career_paths);
  careerPaths.forEach((item, index) => {
    addStringField(fields, `career_paths.${index}.title`, item.title ?? "");
    addStringField(fields, `career_paths.${index}.tag`, item.tag ?? "");
    addStringField(fields, `career_paths.${index}.description`, item.description ?? "");
    addStringField(
      fields,
      `career_paths.${index}.competitiveness`,
      item.competitiveness ?? "",
    );
    addLinesField(
      fields,
      `career_paths.${index}.common_employers`,
      item.common_employers ?? [],
    );
  });

  const coreSkills = parseJsonArray<ProgramCoreSkill>(row.core_skills);
  coreSkills.forEach((item, index) => {
    addStringField(fields, `core_skills.${index}.skill`, item.skill ?? "");
    addStringField(fields, `core_skills.${index}.level`, item.level ?? "");
    addStringField(fields, `core_skills.${index}.description`, item.description ?? "");
  });

  const studyPlan = parseJsonArray<ProgramStudyPlanYear>(row.study_plan);
  studyPlan.forEach((item, index) => {
    addStringField(fields, `study_plan.${index}.year`, item.year ?? "");
    addStringField(fields, `study_plan.${index}.title`, item.title ?? "");
    addLinesField(fields, `study_plan.${index}.topics`, item.topics ?? []);
  });

  const dayInLife = parseJsonArray<ProgramDayInLife>(row.day_in_life);
  dayInLife.forEach((item, index) => {
    addStringField(fields, `day_in_life.${index}.time`, item.time ?? "");
    addLinesField(fields, `day_in_life.${index}.activities`, item.activities ?? []);
    addStringField(fields, `day_in_life.${index}.notes`, item.notes ?? "");
  });

  const salaryRegions = parseJsonArray<ProgramSalaryRegion>(row.salary_regions);
  salaryRegions.forEach((item, index) => {
    addStringField(fields, `salary_regions.${index}.subfield`, item.subfield ?? "");
    addStringField(fields, `salary_regions.${index}.region`, item.region ?? "");
    addStringField(fields, `salary_regions.${index}.demand`, item.demand ?? "");
  });

  const careerExamples = parseJsonArray<ProgramCareerExample>(row.career_examples);
  careerExamples.forEach((item, index) => {
    addStringField(fields, `career_examples.${index}.name`, item.name ?? "");
    addStringField(fields, `career_examples.${index}.role`, item.role ?? "");
    addStringField(fields, `career_examples.${index}.region`, item.region ?? "");
    addStringField(fields, `career_examples.${index}.years`, item.years ?? "");
    addLinesField(fields, `career_examples.${index}.path_steps`, item.path_steps ?? []);
    addStringField(fields, `career_examples.${index}.tag`, item.tag ?? "");
  });

  const employers = parseJsonArray<ProgramEmployer>(row.employers);
  employers.forEach((item, index) => {
    addStringField(fields, `employers.${index}.name`, item.name ?? "");
    addStringField(fields, `employers.${index}.meta`, item.meta ?? "");
    addStringField(fields, `employers.${index}.region`, item.region ?? "");
  });

  const videos = parseJsonArray<ProgramVideo>(row.videos);
  videos.forEach((item, index) => {
    addStringField(fields, `videos.${index}.category`, item.category ?? "");
    addStringField(fields, `videos.${index}.title`, item.title ?? "");
    addStringField(fields, `videos.${index}.channel`, item.channel ?? "");
  });

  return fields;
}

function hasAnyProgramDiscoveryArabic(contentAr: ProgramDiscoveryContentAr): boolean {
  if (Object.keys(contentAr).length === 0) return false;
  return Object.entries(contentAr).some(([, value]) => {
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return false;
  });
}

export function getProgramDiscoveryTranslationStatus(
  row: ProgramDiscoverySourceRow,
  contentAr: ProgramDiscoveryContentAr,
  meta: ProgramDiscoveryContentArMeta | null,
): ProgramDiscoveryTranslationStatus {
  if (!hasAnyProgramDiscoveryArabic(contentAr) || !meta) {
    return "not_translated";
  }

  const currentFields = buildTranslatableProgramDiscoveryFields(row);
  for (const field of currentFields) {
    const storedHash = meta.field_hashes[field.key];
    if (!storedHash || storedHash !== field.sourceHash) {
      return "outdated";
    }
  }

  return "up_to_date";
}

function setNestedArrayField<T extends Record<string, unknown>>(
  array: T[],
  index: number,
  field: string,
  value: string,
): T[] {
  const next = [...array];
  while (next.length <= index) next.push({} as T);
  next[index] = { ...next[index], [field]: value };
  return next;
}

function setNestedArrayLinesField<T extends Record<string, unknown>>(
  array: T[],
  index: number,
  field: string,
  value: string,
): T[] {
  const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
  const next = [...array];
  while (next.length <= index) next.push({} as T);
  next[index] = { ...next[index], [field]: lines };
  return next;
}

export function applyFlatTranslationsToProgramDiscoveryContentAr(
  existing: ProgramDiscoveryContentAr,
  translations: Record<string, string>,
): ProgramDiscoveryContentAr {
  const next: ProgramDiscoveryContentAr = { ...existing };

  for (const key of [
    "title",
    "category",
    "short_description",
    "description",
    "salary_potential",
    "demand_level",
    "math_intensity",
    "ai_resilience",
  ] as const) {
    const value = translations[key]?.trim();
    if (value) next[key] = value;
  }

  if (translations.tags?.trim()) {
    next.tags = translations.tags
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  let careerPaths = [...(next.career_paths ?? [])];
  let coreSkills = [...(next.core_skills ?? [])];
  let studyPlan = [...(next.study_plan ?? [])];
  let dayInLife = [...(next.day_in_life ?? [])];
  let salaryRegions = [...(next.salary_regions ?? [])];
  let careerExamples = [...(next.career_examples ?? [])];
  let employers = [...(next.employers ?? [])];
  let videos = [...(next.videos ?? [])];

  for (const [key, rawValue] of Object.entries(translations)) {
    const value = rawValue.trim();
    if (!value) continue;

    const careerPathMatch = key.match(
      /^career_paths\.(\d+)\.(title|tag|description|competitiveness)$/,
    );
    if (careerPathMatch) {
      const index = Number.parseInt(careerPathMatch[1], 10);
      careerPaths = setNestedArrayField(careerPaths, index, careerPathMatch[2], value);
      continue;
    }

    const careerPathEmployersMatch = key.match(/^career_paths\.(\d+)\.common_employers$/);
    if (careerPathEmployersMatch) {
      const index = Number.parseInt(careerPathEmployersMatch[1], 10);
      careerPaths = setNestedArrayLinesField(careerPaths, index, "common_employers", value);
      continue;
    }

    const coreSkillMatch = key.match(/^core_skills\.(\d+)\.(skill|level|description)$/);
    if (coreSkillMatch) {
      const index = Number.parseInt(coreSkillMatch[1], 10);
      coreSkills = setNestedArrayField(coreSkills, index, coreSkillMatch[2], value);
      continue;
    }

    const studyPlanMatch = key.match(/^study_plan\.(\d+)\.(year|title)$/);
    if (studyPlanMatch) {
      const index = Number.parseInt(studyPlanMatch[1], 10);
      studyPlan = setNestedArrayField(studyPlan, index, studyPlanMatch[2], value);
      continue;
    }

    const studyPlanTopicsMatch = key.match(/^study_plan\.(\d+)\.topics$/);
    if (studyPlanTopicsMatch) {
      const index = Number.parseInt(studyPlanTopicsMatch[1], 10);
      studyPlan = setNestedArrayLinesField(studyPlan, index, "topics", value);
      continue;
    }

    const dayInLifeMatch = key.match(/^day_in_life\.(\d+)\.(time|notes)$/);
    if (dayInLifeMatch) {
      const index = Number.parseInt(dayInLifeMatch[1], 10);
      dayInLife = setNestedArrayField(dayInLife, index, dayInLifeMatch[2], value);
      continue;
    }

    const dayInLifeActivitiesMatch = key.match(/^day_in_life\.(\d+)\.activities$/);
    if (dayInLifeActivitiesMatch) {
      const index = Number.parseInt(dayInLifeActivitiesMatch[1], 10);
      dayInLife = setNestedArrayLinesField(dayInLife, index, "activities", value);
      continue;
    }

    const salaryRegionMatch = key.match(/^salary_regions\.(\d+)\.(subfield|region|demand)$/);
    if (salaryRegionMatch) {
      const index = Number.parseInt(salaryRegionMatch[1], 10);
      salaryRegions = setNestedArrayField(salaryRegions, index, salaryRegionMatch[2], value);
      continue;
    }

    const careerExampleMatch = key.match(
      /^career_examples\.(\d+)\.(name|role|region|years|tag)$/,
    );
    if (careerExampleMatch) {
      const index = Number.parseInt(careerExampleMatch[1], 10);
      careerExamples = setNestedArrayField(
        careerExamples,
        index,
        careerExampleMatch[2],
        value,
      );
      continue;
    }

    const careerExampleStepsMatch = key.match(/^career_examples\.(\d+)\.path_steps$/);
    if (careerExampleStepsMatch) {
      const index = Number.parseInt(careerExampleStepsMatch[1], 10);
      careerExamples = setNestedArrayLinesField(
        careerExamples,
        index,
        "path_steps",
        value,
      );
      continue;
    }

    const employerMatch = key.match(/^employers\.(\d+)\.(name|meta|region)$/);
    if (employerMatch) {
      const index = Number.parseInt(employerMatch[1], 10);
      employers = setNestedArrayField(employers, index, employerMatch[2], value);
      continue;
    }

    const videoMatch = key.match(/^videos\.(\d+)\.(category|title|channel)$/);
    if (videoMatch) {
      const index = Number.parseInt(videoMatch[1], 10);
      videos = setNestedArrayField(videos, index, videoMatch[2], value);
      continue;
    }
  }

  if (careerPaths.length > 0) next.career_paths = careerPaths;
  if (coreSkills.length > 0) next.core_skills = coreSkills;
  if (studyPlan.length > 0) next.study_plan = studyPlan;
  if (dayInLife.length > 0) next.day_in_life = dayInLife;
  if (salaryRegions.length > 0) next.salary_regions = salaryRegions;
  if (careerExamples.length > 0) next.career_examples = careerExamples;
  if (employers.length > 0) next.employers = employers;
  if (videos.length > 0) next.videos = videos;

  return next;
}

export function chunkProgramDiscoveryTranslatableFields(
  fields: TranslatableProgramDiscoveryField[],
  chunkSize = PROGRAM_DISCOVERY_TRANSLATION_CHUNK_SIZE,
): TranslatableProgramDiscoveryField[][] {
  const chunks: TranslatableProgramDiscoveryField[][] = [];
  for (let i = 0; i < fields.length; i += chunkSize) {
    chunks.push(fields.slice(i, i + chunkSize));
  }
  return chunks;
}

export function programDiscoverySourceRowFromRow(
  row: ProgramsDiscoveryRow,
): ProgramDiscoverySourceRow {
  return {
    title: row.title,
    category: row.category,
    short_description: row.short_description,
    description: row.description,
    tags: row.tags,
    salary_potential: row.salary_potential,
    demand_level: row.demand_level,
    math_intensity: row.math_intensity,
    ai_resilience: row.ai_resilience,
    career_paths: row.career_paths,
    core_skills: row.core_skills,
    study_plan: row.study_plan,
    day_in_life: row.day_in_life,
    salary_regions: row.salary_regions,
    career_examples: row.career_examples,
    employers: row.employers,
    videos: row.videos,
  };
}
