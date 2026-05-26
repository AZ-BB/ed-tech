import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import { fetchUniversityShortlistCounts } from "./fetch-university-shortlist-counts";
import type { AdminUniversitiesPageFilters } from "./parse-admin-universities-search-params";

export type AdminUniversityTableRow = {
  id: string;
  name: string;
  locationLabel: string;
  countryLabel: string;
  typeLabel: "Public" | "Private";
  tuitionLabel: string;
  isActive: boolean;
  shortlistedCount: number;
};

const tuitionFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatTuition(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${tuitionFormatter.format(value)}/yr`;
}

function formatLocation(city: string, countryCode: string): string {
  const country = getCountryNameByAlpha2(countryCode);
  const cityTrimmed = city.trim();
  if (cityTrimmed && country) return `${cityTrimmed}, ${country}`;
  if (cityTrimmed) return cityTrimmed;
  if (country) return country;
  return "—";
}

type UniversityQueryRow = {
  id: string;
  name: string;
  city: string;
  country_code: string;
  is_public: boolean;
  is_active: boolean;
  tuition_per_year: number | null;
  countries: { name: string } | null;
};

export async function fetchAdminUniversitiesPage(
  filters: AdminUniversitiesPageFilters,
): Promise<{ rows: AdminUniversityTableRow[]; totalRows: number }> {
  const supabase = await createSupabaseSecretClient();
  const { q, country, status, page, limit } = filters;
  const offset = (page - 1) * limit;

  let query = supabase.from("universities").select(
    "id, name, city, country_code, is_public, is_active, tuition_per_year, countries(name)",
  );

  const trimmed = q.trim();
  if (trimmed) {
    const e = escapeIlike(trimmed);
    query = query.or(`name.ilike.%${e}%,city.ilike.%${e}%`);
  }

  if (country) {
    query = query.eq("country_code", country);
  }

  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "inactive") {
    query = query.eq("is_active", false);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[admin-content] universities page", error);
    return { rows: [], totalRows: 0 };
  }

  const universities = data ?? [];
  const shortlistCounts = await fetchUniversityShortlistCounts(
    universities.map((row) => row.id),
  );

  const rows: AdminUniversityTableRow[] = universities.map((row) => {
    const typed = row as UniversityQueryRow;
    const countryLabel =
      typed.countries?.name?.trim() ||
      getCountryNameByAlpha2(typed.country_code) ||
      typed.country_code ||
      "—";

    return {
      id: typed.id,
      name: typed.name.trim(),
      locationLabel: formatLocation(typed.city, typed.country_code),
      countryLabel,
      typeLabel: typed.is_public ? "Public" : "Private",
      tuitionLabel: formatTuition(typed.tuition_per_year),
      isActive: typed.is_active,
      shortlistedCount: shortlistCounts.get(typed.id) ?? 0,
    };
  });

  rows.sort((a, b) => {
    if (b.shortlistedCount !== a.shortlistedCount) {
      return b.shortlistedCount - a.shortlistedCount;
    }
    return a.name.localeCompare(b.name, "en");
  });

  const totalRows = rows.length;
  const pagedRows = rows.slice(offset, offset + limit);

  return { rows: pagedRows, totalRows };
}
