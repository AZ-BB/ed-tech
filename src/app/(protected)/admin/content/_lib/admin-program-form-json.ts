import {
  joinPipeList,
  parseJsonArray,
  parsePipeList,
  type ProgramCareerExample,
  type ProgramCareerPath,
  type ProgramCoreSkill,
  type ProgramDayInLife,
  type ProgramEmployer,
  type ProgramSalaryRegion,
  type ProgramsDiscoveryRow,
  type ProgramStudyPlanYear,
  type ProgramVideo,
} from "@/lib/programs-discovery-types";

export type ProgramJsonSectionStrings = {
  career_paths_json: string;
  core_skills_json: string;
  study_plan_json: string;
  day_in_life_json: string;
  salary_regions_json: string;
  career_examples_json: string;
  employers_json: string;
  videos_json: string;
};

export type ProgramJsonSections = {
  career_paths: ProgramCareerPath[];
  core_skills: ProgramCoreSkill[];
  study_plan: ProgramStudyPlanYear[];
  day_in_life: ProgramDayInLife[];
  salary_regions: ProgramSalaryRegion[];
  career_examples: ProgramCareerExample[];
  employers: ProgramEmployer[];
  videos: ProgramVideo[];
};

export const EMPTY_PROGRAM_JSON_SECTIONS: ProgramJsonSections = {
  career_paths: [],
  core_skills: [],
  study_plan: [],
  day_in_life: [],
  salary_regions: [],
  career_examples: [],
  employers: [],
  videos: [],
};

export function emptyCareerPathItem(): ProgramCareerPath {
  return { title: "" };
}

export function emptyCoreSkillItem(): ProgramCoreSkill {
  return { skill: "" };
}

export function emptyStudyPlanItem(): ProgramStudyPlanYear {
  return { year: "", title: "" };
}

export function emptyDayInLifeItem(): ProgramDayInLife {
  return { time: "" };
}

export function emptySalaryRegionItem(): ProgramSalaryRegion {
  return { region: "" };
}

export function emptyCareerExampleItem(): ProgramCareerExample {
  return { name: "" };
}

export function emptyEmployerItem(): ProgramEmployer {
  return { name: "" };
}

export function emptyVideoItem(): ProgramVideo {
  return { title: "", youtube_id: "" };
}

function parseJsonString<T>(raw: string): T[] {
  const value = raw.trim();
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return parseJsonArray<T>(parsed);
  } catch {
    return [];
  }
}

export function parseProgramJsonSectionsFromStrings(
  strings: ProgramJsonSectionStrings,
): ProgramJsonSections {
  return {
    career_paths: parseJsonString<ProgramCareerPath>(strings.career_paths_json),
    core_skills: parseJsonString<ProgramCoreSkill>(strings.core_skills_json),
    study_plan: parseJsonString<ProgramStudyPlanYear>(strings.study_plan_json),
    day_in_life: parseJsonString<ProgramDayInLife>(strings.day_in_life_json),
    salary_regions: parseJsonString<ProgramSalaryRegion>(strings.salary_regions_json),
    career_examples: parseJsonString<ProgramCareerExample>(
      strings.career_examples_json,
    ),
    employers: parseJsonString<ProgramEmployer>(strings.employers_json),
    videos: parseJsonString<ProgramVideo>(strings.videos_json),
  };
}

export function parseProgramJsonSectionsFromRow(
  program: Pick<
    ProgramsDiscoveryRow,
    | "career_paths"
    | "core_skills"
    | "study_plan"
    | "day_in_life"
    | "salary_regions"
    | "career_examples"
    | "employers"
    | "videos"
  >,
): ProgramJsonSections {
  return {
    career_paths: parseJsonArray<ProgramCareerPath>(program.career_paths),
    core_skills: parseJsonArray<ProgramCoreSkill>(program.core_skills),
    study_plan: parseJsonArray<ProgramStudyPlanYear>(program.study_plan),
    day_in_life: parseJsonArray<ProgramDayInLife>(program.day_in_life),
    salary_regions: parseJsonArray<ProgramSalaryRegion>(program.salary_regions),
    career_examples: parseJsonArray<ProgramCareerExample>(program.career_examples),
    employers: parseJsonArray<ProgramEmployer>(program.employers),
    videos: parseJsonArray<ProgramVideo>(program.videos),
  };
}

function trimOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function cleanCareerPaths(items: ProgramCareerPath[]): ProgramCareerPath[] {
  return items
    .map((item) => ({
      title: item.title.trim(),
      tag: trimOptional(item.tag),
      description: trimOptional(item.description),
      salary_entry: trimOptional(item.salary_entry),
      salary_mid: trimOptional(item.salary_mid),
      salary_senior: trimOptional(item.salary_senior),
      competitiveness: trimOptional(item.competitiveness),
      common_employers: item.common_employers?.map((v) => v.trim()).filter(Boolean),
    }))
    .filter((item) => item.title);
}

function cleanCoreSkills(items: ProgramCoreSkill[]): ProgramCoreSkill[] {
  return items
    .map((item) => ({
      skill: item.skill.trim(),
      level: trimOptional(item.level),
      description: trimOptional(item.description),
    }))
    .filter((item) => item.skill);
}

function cleanStudyPlan(items: ProgramStudyPlanYear[]): ProgramStudyPlanYear[] {
  return items
    .map((item) => ({
      year: item.year.trim(),
      title: item.title.trim(),
      topics: item.topics?.map((v) => v.trim()).filter(Boolean),
    }))
    .filter((item) => item.year || item.title);
}

function cleanDayInLife(items: ProgramDayInLife[]): ProgramDayInLife[] {
  return items
    .map((item) => ({
      time: item.time.trim(),
      activities: item.activities?.map((v) => v.trim()).filter(Boolean),
      notes: trimOptional(item.notes),
    }))
    .filter((item) => item.time);
}

function cleanSalaryRegions(items: ProgramSalaryRegion[]): ProgramSalaryRegion[] {
  return items
    .map((item) => ({
      subfield: trimOptional(item.subfield),
      region: item.region.trim(),
      entry_salary: trimOptional(item.entry_salary),
      mid_salary: trimOptional(item.mid_salary),
      senior_salary: trimOptional(item.senior_salary),
      demand: trimOptional(item.demand),
    }))
    .filter((item) => item.region);
}

function cleanCareerExamples(items: ProgramCareerExample[]): ProgramCareerExample[] {
  return items
    .map((item) => ({
      name: item.name.trim(),
      role: trimOptional(item.role),
      region: trimOptional(item.region),
      years: trimOptional(item.years),
      path_steps: item.path_steps?.map((v) => v.trim()).filter(Boolean),
      tag: trimOptional(item.tag),
    }))
    .filter((item) => item.name);
}

function cleanEmployers(items: ProgramEmployer[]): ProgramEmployer[] {
  return items
    .map((item) => ({
      name: item.name.trim(),
      meta: trimOptional(item.meta),
      region: trimOptional(item.region),
    }))
    .filter((item) => item.name);
}

function cleanVideos(items: ProgramVideo[]): ProgramVideo[] {
  return items
    .map((item) => ({
      category: trimOptional(item.category),
      title: item.title.trim(),
      youtube_id: item.youtube_id.trim(),
      channel: trimOptional(item.channel),
    }))
    .filter((item) => item.title || item.youtube_id);
}

export function cleanProgramJsonSections(
  sections: ProgramJsonSections,
): ProgramJsonSections {
  return {
    career_paths: cleanCareerPaths(sections.career_paths),
    core_skills: cleanCoreSkills(sections.core_skills),
    study_plan: cleanStudyPlan(sections.study_plan),
    day_in_life: cleanDayInLife(sections.day_in_life),
    salary_regions: cleanSalaryRegions(sections.salary_regions),
    career_examples: cleanCareerExamples(sections.career_examples),
    employers: cleanEmployers(sections.employers),
    videos: cleanVideos(sections.videos),
  };
}

export function serializeProgramJsonSections(
  sections: ProgramJsonSections,
): ProgramJsonSectionStrings {
  const cleaned = cleanProgramJsonSections(sections);
  return {
    career_paths_json: JSON.stringify(cleaned.career_paths),
    core_skills_json: JSON.stringify(cleaned.core_skills),
    study_plan_json: JSON.stringify(cleaned.study_plan),
    day_in_life_json: JSON.stringify(cleaned.day_in_life),
    salary_regions_json: JSON.stringify(cleaned.salary_regions),
    career_examples_json: JSON.stringify(cleaned.career_examples),
    employers_json: JSON.stringify(cleaned.employers),
    videos_json: JSON.stringify(cleaned.videos),
  };
}

export function stringifyProgramJsonSections(program: ProgramsDiscoveryRow) {
  return serializeProgramJsonSections(parseProgramJsonSectionsFromRow(program));
}

/** Form-friendly pipe-separated string for nested string arrays. */
export function pipeListFromArray(values: string[] | null | undefined): string {
  return joinPipeList(values);
}

/** Parse pipe-separated form value into string array. */
export function arrayFromPipeList(raw: string): string[] {
  return parsePipeList(raw);
}
