import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { AdminSchoolsPageFilters } from "./parse-admin-schools-search-params";

export type AdminSchoolTableRow = {
  id: string;
  name: string;
  locationLabel: string;
  code: string;
  studentCount: number;
  studentsLimit: number | null;
  creditPool: number | null;
  yearlyCreditPlan: number | null;
  tokenPercent: number | null;
  isLowTokens: boolean;
  isActive: boolean;
  ownerName: string;
  renewalLabel: string;
};

function formatRenewal(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatLocation(city: string | null, countryCode: string): string {
  const country = getCountryNameByAlpha2(countryCode);
  if (city?.trim() && country) return `${city.trim()}, ${country}`;
  if (city?.trim()) return city.trim();
  if (country) return country;
  return "—";
}

function formatOwnerName(firstName: string, lastName: string): string {
  const full = [firstName, lastName].filter(Boolean).join(" ").trim();
  return full || "—";
}

function computeTokenMeta(
  creditPool: number | null,
  yearlyCreditPlan: number | null,
): { tokenPercent: number | null; isLowTokens: boolean } {
  if (yearlyCreditPlan == null || yearlyCreditPlan <= 0 || creditPool == null) {
    return { tokenPercent: null, isLowTokens: false };
  }

  const pool = Math.max(0, creditPool);
  const percent = Math.round((pool / yearlyCreditPlan) * 100);
  const isLowTokens = percent <= 10;

  return { tokenPercent: percent, isLowTokens };
}

async function fetchStudentCountsBySchool(schoolIds: string[]): Promise<Map<string, number>> {
  if (schoolIds.length === 0) return new Map();

  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("student_profiles")
    .select("school_id")
    .in("school_id", schoolIds);

  if (error) {
    console.error("[admin-schools] student counts", error);
    return new Map();
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.school_id) continue;
    counts.set(row.school_id, (counts.get(row.school_id) ?? 0) + 1);
  }

  return counts;
}

async function fetchOwnerNamesBySchool(schoolIds: string[]): Promise<Map<string, string>> {
  if (schoolIds.length === 0) return new Map();

  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("school_admin_profiles")
    .select("school_id, first_name, last_name, created_at")
    .in("school_id", schoolIds)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[admin-schools] owner names", error);
    return new Map();
  }

  const owners = new Map<string, string>();
  for (const row of data ?? []) {
    if (owners.has(row.school_id)) continue;
    owners.set(row.school_id, formatOwnerName(row.first_name, row.last_name));
  }

  return owners;
}

export async function fetchAdminSchoolsPage(
  filters: AdminSchoolsPageFilters,
): Promise<{ rows: AdminSchoolTableRow[]; totalRows: number }> {
  const supabase = await createSupabaseSecretClient();
  const { q, status, page, limit } = filters;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("schools")
    .select(
      "id, name, code, city, country_code, is_active, students_limit, credit_pool, yearly_credit_plan, renewal_date",
      { count: "exact" },
    )
    .order("name", { ascending: true });

  const trimmed = q.trim();
  if (trimmed) {
    const e = escapeIlike(trimmed);
    query = query.or(`name.ilike.%${e}%,code.ilike.%${e}%,contact_email.ilike.%${e}%`);
  }

  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "inactive") {
    query = query.eq("is_active", false);
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error("[admin-schools] schools page", error);
    return { rows: [], totalRows: 0 };
  }

  const schools = data ?? [];
  const schoolIds = schools.map((school) => school.id);

  const [studentCounts, ownerNames] = await Promise.all([
    fetchStudentCountsBySchool(schoolIds),
    fetchOwnerNamesBySchool(schoolIds),
  ]);

  const rows: AdminSchoolTableRow[] = schools.map((school) => {
    const { tokenPercent, isLowTokens } = computeTokenMeta(
      school.credit_pool,
      school.yearly_credit_plan,
    );

    return {
      id: school.id,
      name: school.name.trim(),
      locationLabel: formatLocation(school.city, school.country_code),
      code: school.code.trim(),
      studentCount: studentCounts.get(school.id) ?? 0,
      studentsLimit: school.students_limit,
      creditPool: school.credit_pool,
      yearlyCreditPlan: school.yearly_credit_plan,
      tokenPercent,
      isLowTokens,
      isActive: school.is_active,
      ownerName: ownerNames.get(school.id) ?? "—",
      renewalLabel: formatRenewal(school.renewal_date),
    };
  });

  return { rows, totalRows: count ?? 0 };
}
