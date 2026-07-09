import "server-only";

import type { ProgramsDiscoveryRow } from "@/lib/programs-discovery-types";
import { createSupabaseServerClient } from "@/utils/supabase-server";

import {
  programRowToDiscoveryProgram,
  type DiscoveryProgram,
} from "./program-row-to-program";
import {
  parseProgramDiscoverySearchParams,
  PROGRAM_DISCOVERY_PAGE_SIZE,
  type ProgramDiscoveryResolvedQuery,
} from "./parse-program-discovery-search-params";

export {
  parseProgramDiscoverySearchParams,
  PROGRAM_DISCOVERY_PAGE_SIZE,
  type ProgramDiscoveryResolvedQuery,
};

export type ProgramDiscoveryCategorySlice = {
  category: string;
  programs: DiscoveryProgram[];
};

export type ProgramDiscoveryPageData = {
  categories: ProgramDiscoveryCategorySlice[];
  programs: DiscoveryProgram[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: {
    q: string;
    category: string;
    featuredOnly: boolean;
  };
  categoryOptions: string[];
  detailProgram: DiscoveryProgram | null;
};

export async function getProgramDiscoveryPage(
  query: ProgramDiscoveryResolvedQuery,
): Promise<ProgramDiscoveryPageData> {
  const supabase = await createSupabaseServerClient();

  let dbQuery = supabase
    .from("programs_discovery")
    .select("*", { count: "exact" })
    .eq("active", true)
    .order("featured", { ascending: false })
    .order("category")
    .order("title");

  if (query.q) {
    dbQuery = dbQuery.or(
      `title.ilike.%${query.q}%,slug.ilike.%${query.q}%,category.ilike.%${query.q}%,short_description.ilike.%${query.q}%`,
    );
  }

  if (query.category) {
    dbQuery = dbQuery.eq("category", query.category);
  }

  if (query.featuredOnly) {
    dbQuery = dbQuery.eq("featured", true);
  }

  const from = (query.page - 1) * PROGRAM_DISCOVERY_PAGE_SIZE;
  const to = from + PROGRAM_DISCOVERY_PAGE_SIZE - 1;

  const [{ data, error, count }, categoryResult, detailResult] =
    await Promise.all([
      dbQuery.range(from, to),
      supabase
        .from("programs_discovery")
        .select("category")
        .eq("active", true)
        .order("category"),
      query.programSlug
        ? supabase
            .from("programs_discovery")
            .select("*")
            .eq("slug", query.programSlug)
            .eq("active", true)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

  if (error) {
    console.error("[program-discovery] list", error);
  }

  const programs = ((data ?? []) as ProgramsDiscoveryRow[]).map(
    programRowToDiscoveryProgram,
  );

  const grouped = new Map<string, DiscoveryProgram[]>();
  for (const program of programs) {
    const bucket = grouped.get(program.category) ?? [];
    bucket.push(program);
    grouped.set(program.category, bucket);
  }

  const categories = [...grouped.entries()].map(([category, items]) => ({
    category,
    programs: items,
  }));

  const categoryOptions = [
    ...new Set(
      (categoryResult.data ?? [])
        .map((row) => row.category)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PROGRAM_DISCOVERY_PAGE_SIZE));

  return {
    categories,
    programs,
    total,
    page: query.page,
    pageSize: PROGRAM_DISCOVERY_PAGE_SIZE,
    totalPages,
    filters: {
      q: query.q,
      category: query.category,
      featuredOnly: query.featuredOnly,
    },
    categoryOptions,
    detailProgram: detailResult.data
      ? programRowToDiscoveryProgram(detailResult.data as ProgramsDiscoveryRow)
      : null,
  };
}
