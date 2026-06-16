import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type UniversityCatalogSearchResult = {
  id: string;
  name: string;
  city: string;
  countryCode: string;
  admissionPageUrl: string | null;
};

export async function searchUniversitiesCatalog(
  queryRaw: string,
  limit = 10,
): Promise<UniversityCatalogSearchResult[]> {
  const query = queryRaw.trim();
  if (query.length < 2) return [];

  const secret = await createSupabaseSecretClient();
  const { data, error } = await secret
    .from("universities")
    .select("id, name, city, country_code, admission_page_url")
    .ilike("name", `%${query}%`)
    .order("name", { ascending: true })
    .limit(Math.min(Math.max(1, limit), 20));

  if (error) {
    console.error("[searchUniversitiesCatalog]", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name.trim(),
    city: row.city.trim(),
    countryCode: row.country_code.trim().toUpperCase(),
    admissionPageUrl: row.admission_page_url?.trim() || null,
  }));
}
