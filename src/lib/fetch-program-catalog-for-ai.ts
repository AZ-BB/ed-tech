import "server-only";

import type { ProgramCareerPath, ProgramsDiscoveryRow } from "@/lib/programs-discovery-types";
import { createSupabaseServerClient } from "@/utils/supabase-server";

export type ProgramCatalogEntry = {
  slug: string;
  title: string;
  category: string;
  short_description: string | null;
  tags: string[];
  demand_level: string | null;
  salary_potential: string | null;
};

export type ProgramEnrichmentEntry = ProgramCatalogEntry & {
  career_paths: ProgramCareerPath[];
};

export async function fetchProgramCatalogForAi(): Promise<ProgramCatalogEntry[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("programs_discovery")
    .select(
      "slug, title, category, short_description, tags, demand_level, salary_potential",
    )
    .eq("active", true)
    .order("featured", { ascending: false })
    .order("title");

  if (error) {
    console.error("[program-matching] catalog", error);
    return [];
  }

  return ((data ?? []) as ProgramsDiscoveryRow[]).map((row) => ({
    slug: row.slug,
    title: row.title,
    category: row.category,
    short_description: row.short_description,
    tags: row.tags ?? [],
    demand_level: row.demand_level,
    salary_potential: row.salary_potential,
  }));
}

export async function fetchProgramsForEnrichment(
  slugs: string[],
): Promise<Map<string, ProgramEnrichmentEntry>> {
  if (slugs.length === 0) return new Map();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("programs_discovery")
    .select(
      "slug, title, category, short_description, tags, demand_level, salary_potential, career_paths",
    )
    .eq("active", true)
    .in("slug", slugs);

  if (error) {
    console.error("[program-matching] enrichment", error);
    return new Map();
  }

  const map = new Map<string, ProgramEnrichmentEntry>();
  for (const row of (data ?? []) as ProgramsDiscoveryRow[]) {
    map.set(row.slug, {
      slug: row.slug,
      title: row.title,
      category: row.category,
      short_description: row.short_description,
      tags: row.tags ?? [],
      demand_level: row.demand_level,
      salary_potential: row.salary_potential,
      career_paths: Array.isArray(row.career_paths) ? row.career_paths : [],
    });
  }
  return map;
}
