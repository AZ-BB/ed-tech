import "server-only";

import type { ProgramsDiscoveryRow } from "@/lib/programs-discovery-types";
import {
  applyProgramDiscoveryLocalization,
  applyRelatedProgramSummaryLocalization,
} from "@/lib/content-localization";
import { getServerLocale } from "@/lib/i18n/get-server-locale";
import { createSupabaseServerClient } from "@/utils/supabase-server";

import {
  PROGRAM_INTEREST_TILES,
  type InterestTile,
} from "./program-discovery-constants";
import {
  programRowToDiscoveryProgram,
  type DiscoveryProgram,
} from "./program-row-to-program";
import { withValidProgramVideos } from "./with-valid-program-videos";
import { programDiscoverySearchOrFilter } from "./program-discovery-search";

export type ProgramExplorerPageData = {
  programs: DiscoveryProgram[];
  popularPrograms: DiscoveryProgram[];
  interestTiles: (InterestTile & { count: number })[];
  selectedInterest: string | null;
  interestPrograms: DiscoveryProgram[];
  filters: { q: string };
};

export async function getProgramExplorerPage(options: {
  q?: string;
  interest?: string | null;
}): Promise<ProgramExplorerPageData> {
  const locale = await getServerLocale();
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("programs_discovery")
    .select("*")
    .eq("active", true)
    .order("featured", { ascending: false })
    .order("title");

  const q = options.q?.trim();
  if (q) {
    query = query.or(programDiscoverySearchOrFilter(q));
  }

  const { data, error } = await query;

  if (error) {
    console.error("[program-explorer] list", error);
  }

  const programs = ((data ?? []) as ProgramsDiscoveryRow[]).map((row) =>
    applyProgramDiscoveryLocalization(
      locale,
      programRowToDiscoveryProgram(row),
      row.content_ar ?? null,
    ),
  );

  const interestTiles = PROGRAM_INTEREST_TILES.map((tile) => ({
    ...tile,
    count: programs.filter((p) =>
      p.characteristicIds.includes(tile.characteristicId),
    ).length,
  }));

  const selectedInterest = options.interest?.trim() || null;
  const interestPrograms = selectedInterest
    ? programs.filter((p) => p.characteristicIds.includes(selectedInterest))
    : [];

  const popularPrograms = [...programs]
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.title.localeCompare(b.title);
    })
    .slice(0, 6);

  return {
    programs,
    popularPrograms,
    interestTiles,
    selectedInterest,
    interestPrograms,
    filters: { q: q ?? "" },
  };
}

export async function getProgramDetailBySlug(
  slug: string,
): Promise<DiscoveryProgram | null> {
  const locale = await getServerLocale();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("programs_discovery")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("[program-detail] fetch", error);
    return null;
  }

  if (!data) return null;
  const program = applyProgramDiscoveryLocalization(
    locale,
    programRowToDiscoveryProgram(data as ProgramsDiscoveryRow),
    (data as ProgramsDiscoveryRow).content_ar ?? null,
  );
  return withValidProgramVideos(program);
}

export type RelatedProgramSummary = {
  slug: string;
  title: string;
  category: string;
};

export async function getRelatedPrograms(
  program: DiscoveryProgram,
  limit = 6,
): Promise<RelatedProgramSummary[]> {
  const locale = await getServerLocale();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("programs_discovery")
    .select("slug, title, category, characteristic_ids, content_ar")
    .eq("active", true)
    .neq("slug", program.slug)
    .order("featured", { ascending: false })
    .order("title")
    .limit(40);

  if (error) {
    console.error("[program-detail] related", error);
    return [];
  }

  const rows = (data ?? []) as Pick<
    ProgramsDiscoveryRow,
    "slug" | "title" | "category" | "characteristic_ids" | "content_ar"
  >[];

  const scored = rows.map((row) => {
    const sharedCharacteristics = (row.characteristic_ids ?? []).filter((id) =>
      program.characteristicIds.includes(id),
    ).length;
    const sameCategory = row.category === program.category ? 1 : 0;
    return {
      slug: row.slug,
      title: row.title,
      category: row.category,
      score: sameCategory * 2 + sharedCharacteristics,
    };
  });

  return scored
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit)
    .map(({ slug, title, category }) => {
      const row = rows.find((item) => item.slug === slug);
      return applyRelatedProgramSummaryLocalization(
        locale,
        { slug, title, category },
        row?.content_ar ?? null,
      );
    });
}
