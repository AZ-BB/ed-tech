import type { Json } from "@/database.types";

export type ProgramCareerPath = {
  title: string;
  tag?: string;
  description?: string;
  salary_entry?: string;
  salary_mid?: string;
  salary_senior?: string;
  competitiveness?: string;
  common_employers?: string[];
};

export type ProgramCoreSkill = {
  skill: string;
  level?: string;
  description?: string;
};

export type ProgramStudyPlanYear = {
  year: string;
  title: string;
  topics?: string[];
};

export type ProgramDayInLife = {
  time: string;
  activities?: string[];
  notes?: string;
};

export type ProgramSalaryRegion = {
  subfield?: string;
  region: string;
  entry_salary?: string;
  mid_salary?: string;
  senior_salary?: string;
  demand?: string;
};

export type ProgramCareerExample = {
  name: string;
  role?: string;
  region?: string;
  years?: string;
  path_steps?: string[];
  tag?: string;
};

export type ProgramEmployer = {
  name: string;
  meta?: string;
  region?: string;
};

export type ProgramVideo = {
  category?: string;
  title: string;
  youtube_id: string;
  channel?: string;
};

export type ProgramsDiscoveryRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  short_description: string | null;
  description: string | null;
  characteristic_ids: string[] | null;
  tags: string[] | null;
  salary_potential: string | null;
  demand_level: string | null;
  math_intensity: string | null;
  ai_resilience: string | null;
  featured: boolean | null;
  active: boolean | null;
  career_paths: ProgramCareerPath[] | null;
  core_skills: ProgramCoreSkill[] | null;
  study_plan: ProgramStudyPlanYear[] | null;
  day_in_life: ProgramDayInLife[] | null;
  salary_regions: ProgramSalaryRegion[] | null;
  career_examples: ProgramCareerExample[] | null;
  employers: ProgramEmployer[] | null;
  videos: ProgramVideo[] | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ProgramsDiscoveryInsert = {
  slug: string;
  title: string;
  category: string;
  short_description: string | null;
  description: string | null;
  characteristic_ids: string[] | null;
  tags: string[] | null;
  salary_potential: string | null;
  demand_level: string | null;
  math_intensity: string | null;
  ai_resilience: string | null;
  featured: boolean;
  active: boolean;
  career_paths: Json | null;
  core_skills: Json | null;
  study_plan: Json | null;
  day_in_life: Json | null;
  salary_regions: Json | null;
  career_examples: Json | null;
  employers: Json | null;
  videos: Json | null;
};

export function parsePipeList(raw: string): string[] {
  return raw
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function joinPipeList(values: string[] | null | undefined): string {
  return (values ?? []).join(" | ");
}

export function asJson<T>(value: T | null | undefined): Json {
  return (value ?? null) as Json;
}

export function parseJsonArray<T>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value as T[];
}
