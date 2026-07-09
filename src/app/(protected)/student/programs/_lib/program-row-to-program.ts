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

export type DiscoveryProgram = {
  id: string;
  slug: string;
  title: string;
  category: string;
  shortDescription: string;
  description: string;
  tags: string[];
  characteristicIds: string[];
  salaryPotential: string;
  demandLevel: string;
  mathIntensity: string;
  aiResilience: string;
  featured: boolean;
  careerPaths: ProgramCareerPath[];
  coreSkills: ProgramCoreSkill[];
  studyPlan: ProgramStudyPlanYear[];
  dayInLife: ProgramDayInLife[];
  salaryRegions: ProgramSalaryRegion[];
  careerExamples: ProgramCareerExample[];
  employers: ProgramEmployer[];
  videos: ProgramVideo[];
};

export function programRowToDiscoveryProgram(
  row: ProgramsDiscoveryRow,
): DiscoveryProgram {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    shortDescription: row.short_description ?? "",
    description: row.description ?? "",
    tags: row.tags ?? [],
    characteristicIds: row.characteristic_ids ?? [],
    salaryPotential: row.salary_potential ?? "",
    demandLevel: row.demand_level ?? "",
    mathIntensity: row.math_intensity ?? "",
    aiResilience: row.ai_resilience ?? "",
    featured: row.featured ?? false,
    careerPaths: (row.career_paths as ProgramCareerPath[] | null) ?? [],
    coreSkills: (row.core_skills as ProgramCoreSkill[] | null) ?? [],
    studyPlan: (row.study_plan as ProgramStudyPlanYear[] | null) ?? [],
    dayInLife: (row.day_in_life as ProgramDayInLife[] | null) ?? [],
    salaryRegions: (row.salary_regions as ProgramSalaryRegion[] | null) ?? [],
    careerExamples: (row.career_examples as ProgramCareerExample[] | null) ?? [],
    employers: (row.employers as ProgramEmployer[] | null) ?? [],
    videos: (row.videos as ProgramVideo[] | null) ?? [],
  };
}
