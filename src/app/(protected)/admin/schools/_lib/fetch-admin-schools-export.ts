import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { AdminSchoolsPageFilters } from "./parse-admin-schools-search-params";

export type AdminSchoolExportRow = {
  id: string;
  name: string;
  code: string;
  city: string;
  country: string;
  contactEmail: string;
  studentsCount: number;
  studentsLimit: string;
  teachersCount: number;
  creditPool: string;
  yearlyCreditPlan: string;
  tokenPercent: string;
  accessStatus: string;
  subscriptionStatus: string;
  ownerName: string;
  renewalDate: string;
  createdAt: string;
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function formatOwnerName(firstName: string, lastName: string): string {
  const full = [firstName, lastName].filter(Boolean).join(" ").trim();
  return full || "";
}

function computeTokenPercent(
  creditPool: number | null,
  yearlyCreditPlan: number | null,
): string {
  if (yearlyCreditPlan == null || yearlyCreditPlan <= 0 || creditPool == null) return "";
  return String(Math.round((Math.max(0, creditPool) / yearlyCreditPlan) * 100));
}

async function fetchCountsBySchool(
  table: "student_profiles" | "school_admin_profiles",
  schoolIds: string[],
): Promise<Map<string, number>> {
  if (schoolIds.length === 0) return new Map();

  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from(table)
    .select("school_id")
    .in("school_id", schoolIds);

  if (error) {
    console.error(`[admin-schools-export] ${table} counts`, error);
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
    console.error("[admin-schools-export] owner names", error);
    return new Map();
  }

  const owners = new Map<string, string>();
  for (const row of data ?? []) {
    if (owners.has(row.school_id)) continue;
    owners.set(row.school_id, formatOwnerName(row.first_name, row.last_name));
  }

  return owners;
}

export async function fetchAdminSchoolsExportRows(
  filters: Pick<AdminSchoolsPageFilters, "q" | "status">,
): Promise<AdminSchoolExportRow[]> {
  const supabase = await createSupabaseSecretClient();
  const { q, status } = filters;

  let query = supabase
    .from("schools")
    .select(
      "id, name, code, city, country_code, contact_email, is_active, students_limit, credit_pool, yearly_credit_plan, renewal_date, subscription_status, created_at",
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

  const { data, error } = await query;

  if (error) {
    console.error("[admin-schools-export] schools", error);
    return [];
  }

  const schools = data ?? [];
  const schoolIds = schools.map((school) => school.id);

  const [studentCounts, teacherCounts, ownerNames] = await Promise.all([
    fetchCountsBySchool("student_profiles", schoolIds),
    fetchCountsBySchool("school_admin_profiles", schoolIds),
    fetchOwnerNamesBySchool(schoolIds),
  ]);

  return schools.map((school) => ({
    id: school.id,
    name: school.name.trim(),
    code: school.code.trim(),
    city: school.city?.trim() ?? "",
    country: getCountryNameByAlpha2(school.country_code) ?? school.country_code,
    contactEmail: school.contact_email.trim(),
    studentsCount: studentCounts.get(school.id) ?? 0,
    studentsLimit: school.students_limit != null ? String(school.students_limit) : "",
    teachersCount: teacherCounts.get(school.id) ?? 0,
    creditPool: school.credit_pool != null ? String(school.credit_pool) : "",
    yearlyCreditPlan:
      school.yearly_credit_plan != null ? String(school.yearly_credit_plan) : "",
    tokenPercent: computeTokenPercent(school.credit_pool, school.yearly_credit_plan),
    accessStatus: school.is_active ? "Active" : "Inactive",
    subscriptionStatus: String(school.subscription_status ?? "ACTIVE"),
    ownerName: ownerNames.get(school.id) ?? "",
    renewalDate: formatDate(school.renewal_date),
    createdAt: formatDate(school.created_at),
  }));
}
