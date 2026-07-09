import { createSupabaseSecretClient } from "@/utils/supabase-server";

import { mapProgramDiscoveryRowToExport } from "./admin-programs-discovery-excel";
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

export type AdminProgramDiscoveryExportRow = {
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
  career_paths: ProgramCareerPath[] | null;
  core_skills: ProgramCoreSkill[] | null;
  study_plan: ProgramStudyPlanYear[] | null;
  day_in_life: ProgramDayInLife[] | null;
  salary_regions: ProgramSalaryRegion[] | null;
  career_examples: ProgramCareerExample[] | null;
  employers: ProgramEmployer[] | null;
  videos: ProgramVideo[] | null;
};

export async function fetchAdminProgramsDiscoveryExport(): Promise<
  AdminProgramDiscoveryExportRow[]
> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("programs_discovery")
    .select("*")
    .order("category")
    .order("title");

  if (error) {
    console.error("[admin-programs-discovery] export", error);
    return [];
  }

  return ((data ?? []) as ProgramsDiscoveryRow[]).map(mapProgramDiscoveryRowToExport);
}
