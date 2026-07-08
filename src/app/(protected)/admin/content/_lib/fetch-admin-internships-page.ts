import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import type { Database } from "@/database.types";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import { fetchInternshipActivityCounts } from "./fetch-internship-activity-counts";
import type { AdminInternshipsPageFilters } from "./parse-admin-internships-search-params";

type InternshipSection = Database["public"]["Enums"]["internship_section"];
type InternshipFormat = Database["public"]["Enums"]["internship_format"];
type InternshipPayTier = Database["public"]["Enums"]["internship_pay_tier"];

export type AdminInternshipTableRow = {
  id: string;
  name: string;
  provider: string;
  sectionLabel: string;
  countryLabel: string;
  formatLabel: string;
  payLabel: string;
  isActive: boolean;
  needsReview: boolean;
  savedCount: number;
};

const SECTION_LABELS: Record<InternshipSection, string> = {
  live: "Live",
  global: "Global",
  competition: "Competition",
  find: "Find",
};

const FORMAT_LABELS: Record<InternshipFormat, string> = {
  in_person: "In person",
  remote: "Remote",
  hybrid: "Hybrid",
  directory: "Directory",
};

type InternshipQueryRow = {
  id: string;
  name: string;
  provider: string;
  section: InternshipSection;
  country_code: string;
  format: InternshipFormat;
  pay_tier: InternshipPayTier;
  pay_label: string;
  is_active: boolean;
  needs_review: boolean;
  countries: { name: string } | null;
};

export async function fetchAdminInternshipsPage(
  filters: AdminInternshipsPageFilters,
): Promise<{ rows: AdminInternshipTableRow[]; totalRows: number }> {
  const supabase = await createSupabaseSecretClient();
  const { q, section, country, format, payTier, status, page, limit } = filters;
  const offset = (page - 1) * limit;

  let query = supabase.from("internships").select(
    `id, name, provider, section, country_code, format, pay_tier, pay_label, is_active, needs_review,
       countries(name)`,
  );

  const trimmed = q.trim();
  if (trimmed) {
    const e = escapeIlike(trimmed);
    query = query.or(
      `name.ilike.%${e}%,provider.ilike.%${e}%,summary.ilike.%${e}%,field.ilike.%${e}%`,
    );
  }

  if (section) query = query.eq("section", section as InternshipSection);
  if (country) query = query.eq("country_code", country);
  if (format) query = query.eq("format", format as InternshipFormat);
  if (payTier) query = query.eq("pay_tier", payTier as InternshipPayTier);

  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "inactive") {
    query = query.eq("is_active", false);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[admin-content] internships page", error);
    return { rows: [], totalRows: 0 };
  }

  const internships = data ?? [];
  const savedCounts = await fetchInternshipActivityCounts(
    internships.map((row) => row.id),
  );

  const rows: AdminInternshipTableRow[] = internships.map((row) => {
    const typed = row as InternshipQueryRow;
    const countryLabel =
      typed.countries?.name?.trim() ||
      getCountryNameByAlpha2(typed.country_code) ||
      typed.country_code ||
      "—";

    return {
      id: typed.id,
      name: typed.name.trim(),
      provider: typed.provider.trim(),
      sectionLabel: SECTION_LABELS[typed.section] ?? typed.section,
      countryLabel,
      formatLabel: FORMAT_LABELS[typed.format] ?? typed.format,
      payLabel: typed.pay_label.trim() || "—",
      isActive: typed.is_active,
      needsReview: typed.needs_review,
      savedCount: savedCounts.get(typed.id) ?? 0,
    };
  });

  rows.sort((a, b) => {
    if (b.savedCount !== a.savedCount) {
      return b.savedCount - a.savedCount;
    }
    return a.name.localeCompare(b.name, "en");
  });

  const totalRows = rows.length;
  const pagedRows = rows.slice(offset, offset + limit);

  return { rows: pagedRows, totalRows };
}
