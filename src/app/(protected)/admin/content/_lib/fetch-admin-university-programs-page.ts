import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { UniversityProgramExportRow } from "@/lib/university-programs-types";

import type { AdminUniversityProgramsStatusFilter } from "./parse-admin-university-programs-search-params";

export type AdminUniversityProgramTableRow = {
  id: string;
  universityId: string;
  universityName: string;
  programId: string;
  programSlug: string;
  programTitle: string;
  rankingNote: string | null;
  tuitionNote: string | null;
  shortDescription: string | null;
  programSchoolNote: string | null;
  featured: boolean;
  updatedAt: string | null;
};

type UniversityProgramListRow = {
  id: string;
  university_id: string;
  program_id: string;
  ranking_note: string | null;
  tuition_note: string | null;
  short_description: string | null;
  program_school_note: string | null;
  featured: boolean;
  updated_at: string | null;
  universities: { name: string } | { name: string }[] | null;
  programs_discovery:
    | { slug: string; title: string }
    | { slug: string; title: string }[]
    | null;
};

function relationName<T extends { name?: string }>(
  value: T | T[] | null | undefined,
): string {
  if (!value) return "";
  return Array.isArray(value) ? (value[0]?.name ?? "") : (value.name ?? "");
}

function relationProgram(
  value:
    | { slug: string; title: string }
    | { slug: string; title: string }[]
    | null
    | undefined,
): { slug: string; title: string } {
  if (!value) return { slug: "", title: "" };
  return Array.isArray(value) ? (value[0] ?? { slug: "", title: "" }) : value;
}

export async function fetchAdminUniversityProgramsPage(options: {
  q: string;
  programSlug: string;
  status: AdminUniversityProgramsStatusFilter;
  page: number;
  limit: number;
}): Promise<{ rows: AdminUniversityProgramTableRow[]; totalRows: number }> {
  const supabase = await createSupabaseSecretClient();
  const from = (options.page - 1) * options.limit;
  const to = from + options.limit - 1;

  let query = supabase
    .from("university_programs")
    .select(
      `
      id,
      university_id,
      program_id,
      ranking_note,
      tuition_note,
      short_description,
      program_school_note,
      featured,
      updated_at,
      universities ( name ),
      programs_discovery ( slug, title )
    `,
      { count: "exact" },
    )
    .order("updated_at", { ascending: false });

  if (options.programSlug) {
    const { data: program } = await supabase
      .from("programs_discovery")
      .select("id")
      .eq("slug", options.programSlug)
      .maybeSingle();

    if (!program?.id) {
      return { rows: [], totalRows: 0 };
    }
    query = query.eq("program_id", program.id);
  }

  if (options.status === "featured") {
    query = query.eq("featured", true);
  } else if (options.status === "not-featured") {
    query = query.eq("featured", false);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    console.error("[admin-university-programs] list", error);
    return { rows: [], totalRows: 0 };
  }

  let rows = (data ?? []) as UniversityProgramListRow[];

  const q = options.q.trim().toLowerCase();
  if (q) {
    rows = rows.filter((row) => {
      const uni = relationName(row.universities).toLowerCase();
      const program = relationProgram(row.programs_discovery);
      return (
        uni.includes(q) ||
        program.slug.toLowerCase().includes(q) ||
        program.title.toLowerCase().includes(q) ||
        (row.ranking_note ?? "").toLowerCase().includes(q) ||
        (row.tuition_note ?? "").toLowerCase().includes(q)
      );
    });
  }

  return {
    rows: rows.map((row) => {
      const program = relationProgram(row.programs_discovery);
      return {
        id: row.id,
        universityId: row.university_id,
        universityName: relationName(row.universities),
        programId: row.program_id,
        programSlug: program.slug,
        programTitle: program.title,
        rankingNote: row.ranking_note,
        tuitionNote: row.tuition_note,
        shortDescription: row.short_description,
        programSchoolNote: row.program_school_note,
        featured: row.featured ?? false,
        updatedAt: row.updated_at,
      };
    }),
    totalRows: q ? rows.length : (count ?? 0),
  };
}

export type AdminUniversityOption = {
  id: string;
  name: string;
  city: string;
  countryCode: string;
};

export async function fetchAdminUniversityOptions(): Promise<AdminUniversityOption[]> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("universities")
    .select("id, name, city, country_code")
    .order("name");

  if (error) {
    console.error("[admin-university-programs] university options", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    city: row.city,
    countryCode: row.country_code,
  }));
}

export type AdminProgramDiscoveryOption = {
  id: string;
  slug: string;
  title: string;
};

export async function fetchAdminProgramDiscoveryOptions(): Promise<
  AdminProgramDiscoveryOption[]
> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("programs_discovery")
    .select("id, slug, title")
    .order("title");

  if (error) {
    console.error("[admin-university-programs] program options", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
  }));
}

export async function fetchAdminUniversityProgramsExport(): Promise<
  UniversityProgramExportRow[]
> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("university_programs")
    .select(
      `
      ranking_note,
      tuition_note,
      short_description,
      program_school_note,
      featured,
      universities ( name ),
      programs_discovery ( slug )
    `,
    )
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[admin-university-programs] export", error);
    return [];
  }

  return ((data ?? []) as UniversityProgramListRow[]).map((row) => ({
    program_id: relationProgram(row.programs_discovery).slug,
    university_name: relationName(row.universities),
    ranking_note: row.ranking_note ?? "",
    tuition_note: row.tuition_note ?? "",
    short_description: row.short_description ?? "",
    program_school_note: row.program_school_note ?? "",
    featured: row.featured ? "true" : "false",
  }));
}
