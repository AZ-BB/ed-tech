import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { ProgramsDiscoveryRow } from "@/lib/programs-discovery-types";

export type AdminProgramDiscoveryTableRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  featured: boolean;
  active: boolean;
  updatedAt: string | null;
};

export async function fetchAdminProgramsDiscoveryPage(options: {
  q: string;
  category: string;
  status: "all" | "active" | "inactive";
  page: number;
  limit: number;
}): Promise<{ rows: AdminProgramDiscoveryTableRow[]; totalRows: number }> {
  const supabase = await createSupabaseSecretClient();
  const from = (options.page - 1) * options.limit;
  const to = from + options.limit - 1;

  let query = supabase
    .from("programs_discovery")
    .select("id, slug, title, category, featured, active, updated_at", {
      count: "exact",
    })
    .order("updated_at", { ascending: false });

  const q = options.q.trim();
  if (q) {
    query = query.or(
      `title.ilike.%${q}%,slug.ilike.%${q}%,category.ilike.%${q}%`,
    );
  }

  if (options.category.trim()) {
    query = query.eq("category", options.category.trim());
  }

  if (options.status === "active") {
    query = query.eq("active", true);
  } else if (options.status === "inactive") {
    query = query.eq("active", false);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    console.error("[admin-programs-discovery] list", error);
    return { rows: [], totalRows: 0 };
  }

  return {
    rows: (data ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category,
      featured: row.featured ?? false,
      active: row.active ?? true,
      updatedAt: row.updated_at,
    })),
    totalRows: count ?? 0,
  };
}

export async function fetchAdminProgramDiscoveryCategoryOptions(): Promise<
  string[]
> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("programs_discovery")
    .select("category")
    .order("category");

  if (error) {
    console.error("[admin-programs-discovery] categories", error);
    return [];
  }

  return [...new Set((data ?? []).map((row) => row.category).filter(Boolean))];
}

export async function fetchAdminProgramDiscoveryDetail(
  id: string,
): Promise<ProgramsDiscoveryRow | null> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("programs_discovery")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[admin-programs-discovery] detail", error);
    return null;
  }

  return (data as ProgramsDiscoveryRow | null) ?? null;
}
