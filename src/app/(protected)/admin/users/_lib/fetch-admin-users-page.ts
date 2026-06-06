import { formatDistanceToNow } from "date-fns";

import { applyNameEmailSearch } from "@/app/(protected)/school/_lib/student-search";
import { applyStudentTeacherFilter } from "@/lib/fetch-school-teacher-options";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import { teacherNameFromEmbed } from "@/lib/student-teacher-assignment";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { UsersTabId } from "../_data/users-tabs-data";
import { attachLastActiveFromActivityLogs } from "./fetch-latest-user-activity";
import type { AdminUsersPageFilters, AdminUsersStatusFilter } from "./parse-admin-users-search-params";

type AdminSupabase = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type AdminAdvisorTableDetail = {
  title: string;
  specializations: string;
  experienceYears: string;
  languages: string;
  tags: string;
  statusLabel: string;
  isActive: boolean;
};

export type AdminAmbassadorTableDetail = {
  university: string;
  major: string;
  destination: string;
  nationality: string;
  studentStatus: string;
  tags: string;
  statusLabel: string;
  isActive: boolean;
};

export type AdminUserTableRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  school: string;
  lastActiveLabel: string;
  joinedLabel: string;
  isActive: boolean;
  sortLastName: string;
  sortFirstName: string;
  teacherName?: string | null;
  advisorDetail?: AdminAdvisorTableDetail;
  ambassadorDetail?: AdminAmbassadorTableDetail;
};

function formatJoined(iso: string | null | undefined): string {
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

function formatLastActive(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}

function formatAdminRole(role: string | null | undefined): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "moderator":
      return "Moderator";
    case "admin":
      return "Admin";
    default:
      return "Admin";
  }
}

function schoolNameFromEmbed(
  schools: { name: string } | { name: string }[] | null | undefined,
): string {
  if (!schools) return "—";
  if (Array.isArray(schools)) return schools[0]?.name?.trim() || "—";
  return schools.name?.trim() || "—";
}

function applySchoolFilter<T extends { eq: (column: string, value: string) => T }>(
  query: T,
  schoolId: string,
): T {
  const trimmed = schoolId.trim();
  if (!trimmed) return query;
  return query.eq("school_id", trimmed);
}

function applyStatusFilter<T extends { eq: (column: string, value: boolean) => T }>(
  query: T,
  status: AdminUsersStatusFilter,
): T {
  if (status === "active") return query.eq("is_active", true);
  if (status === "inactive") return query.eq("is_active", false);
  return query;
}

function formatListPreview(values: string[], maxItems = 3): string {
  if (values.length === 0) return "—";
  if (values.length <= maxItems) return values.join(", ");
  return `${values.slice(0, maxItems).join(", ")} +${values.length - maxItems}`;
}

function formatCountryCodes(codes: string[]): string {
  const names = codes
    .map((code) => getCountryNameByAlpha2(code.trim().toUpperCase()) ?? code.trim().toUpperCase())
    .filter(Boolean);
  return formatListPreview(names);
}

const ADVISOR_TABLE_SELECT = `
  id, first_name, last_name, email, created_at,
  title, experience_years, languages, nationality_country_code, is_active,
  advisor_tags_joint ( advisor_tags ( text ) ),
  advisor_specializations_countries ( country_code )
`;

const AMBASSADOR_TABLE_SELECT = `
  id, first_name, last_name, email, created_at,
  major, university_name, destination_country_code, nationality_country_code,
  is_current_student, is_active,
  universities ( name ),
  ambassador_tags_joint ( ambassador_tags ( text ) )
`;

type AdvisorTableQueryRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string | null;
  title: string | null;
  experience_years: number | null;
  languages: string | null;
  nationality_country_code: string;
  is_active: boolean;
  advisor_tags_joint: { advisor_tags: { text: string } | null }[] | null;
  advisor_specializations_countries: { country_code: string }[] | null;
};

type AmbassadorTableQueryRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string | null;
  major: string | null;
  university_name: string | null;
  destination_country_code: string;
  nationality_country_code: string;
  is_current_student: boolean;
  is_active: boolean;
  universities: { name: string } | null;
  ambassador_tags_joint: { ambassador_tags: { text: string } | null }[] | null;
};

function mapAdvisorToTableRow(row: AdvisorTableQueryRow): AdminUserTableRow {
  const firstName = row.first_name?.trim() ?? "";
  const lastName = row.last_name?.trim() ?? "";
  const tags =
    row.advisor_tags_joint
      ?.map((joint) => joint.advisor_tags?.text)
      .filter((tag): tag is string => typeof tag === "string" && tag.length > 0) ?? [];
  const countryCodes =
    row.advisor_specializations_countries
      ?.map((entry) => entry.country_code)
      .filter((code): code is string => typeof code === "string" && code.length > 0) ?? [];

  return {
    id: row.id,
    firstName,
    lastName,
    email: row.email?.trim() ?? "",
    role: "Advisor",
    school: "—",
    lastActiveLabel: "—",
    joinedLabel: formatJoined(row.created_at),
    isActive: row.is_active,
    sortLastName: lastName.toLowerCase(),
    sortFirstName: firstName.toLowerCase(),
    advisorDetail: {
      title: row.title?.trim() || "—",
      specializations: formatCountryCodes(countryCodes),
      experienceYears:
        row.experience_years != null ? `${row.experience_years} yrs` : "—",
      languages: row.languages?.trim() || "—",
      tags: formatListPreview(tags),
      statusLabel: row.is_active ? "Active" : "Inactive",
      isActive: row.is_active,
    },
  };
}

function mapAmbassadorToTableRow(row: AmbassadorTableQueryRow): AdminUserTableRow {
  const firstName = row.first_name?.trim() ?? "";
  const lastName = row.last_name?.trim() ?? "";
  const tags =
    row.ambassador_tags_joint
      ?.map((joint) => joint.ambassador_tags?.text)
      .filter((tag): tag is string => typeof tag === "string" && tag.length > 0) ?? [];
  const universityFromJoin = row.universities?.name?.trim();
  const university =
    (universityFromJoin && universityFromJoin.length > 0
      ? universityFromJoin
      : row.university_name?.trim()) || "—";

  return {
    id: row.id,
    firstName,
    lastName,
    email: row.email?.trim() ?? "",
    role: "Ambassador",
    school: "—",
    lastActiveLabel: "—",
    joinedLabel: formatJoined(row.created_at),
    isActive: row.is_active,
    sortLastName: lastName.toLowerCase(),
    sortFirstName: firstName.toLowerCase(),
    ambassadorDetail: {
      university,
      major: row.major?.trim() || "—",
      destination:
        getCountryNameByAlpha2(row.destination_country_code) ??
        row.destination_country_code ??
        "—",
      nationality:
        getCountryNameByAlpha2(row.nationality_country_code) ??
        row.nationality_country_code ??
        "—",
      studentStatus: row.is_current_student ? "Current student" : "Alumni",
      tags: formatListPreview(tags),
      statusLabel: row.is_active ? "Active" : "Inactive",
      isActive: row.is_active,
    },
  };
}

function sortRows(rows: AdminUserTableRow[]): AdminUserTableRow[] {
  return [...rows].sort((a, b) => {
    const ln = a.sortLastName.localeCompare(b.sortLastName, undefined, {
      sensitivity: "base",
    });
    if (ln !== 0) return ln;
    return a.sortFirstName.localeCompare(b.sortFirstName, undefined, {
      sensitivity: "base",
    });
  });
}

function paginateRows(
  rows: AdminUserTableRow[],
  page: number,
  limit: number,
): AdminUserTableRow[] {
  const offset = (page - 1) * limit;
  return rows.slice(offset, offset + limit);
}

async function fetchStudentRows(
  supabase: AdminSupabase,
  q: string,
  schoolId = "",
  status: AdminUsersStatusFilter = "",
  teacher: AdminUsersPageFilters["teacher"] = "",
): Promise<AdminUserTableRow[]> {
  let query = supabase
    .from("student_profiles")
    .select(
      "id, first_name, last_name, email, created_at, is_active, teacher_id, schools(name), school_admin_profiles:teacher_id ( first_name, last_name, email )",
    );

  query = applyNameEmailSearch(query, q);
  query = applySchoolFilter(query, schoolId);
  query = applyStatusFilter(query, status);
  query = applyStudentTeacherFilter(query, teacher);

  const { data, error } = await query
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) {
    console.error("[admin-users] student_profiles", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const firstName = row.first_name?.trim() ?? "";
    const lastName = row.last_name?.trim() ?? "";
    const teacherEmbedRaw = row.school_admin_profiles as
      | { first_name: string | null; last_name: string | null; email: string | null }
      | { first_name: string | null; last_name: string | null; email: string | null }[]
      | null;
    const teacherEmbed = Array.isArray(teacherEmbedRaw)
      ? (teacherEmbedRaw[0] ?? null)
      : teacherEmbedRaw;
    return {
      id: row.id,
      firstName,
      lastName,
      email: row.email?.trim() ?? "",
      role: "Student",
      school: schoolNameFromEmbed(row.schools),
      lastActiveLabel: "—",
      joinedLabel: formatJoined(row.created_at),
      isActive: row.is_active,
      sortLastName: lastName.toLowerCase(),
      sortFirstName: firstName.toLowerCase(),
      teacherName: teacherNameFromEmbed(teacherEmbed),
    };
  });
}

async function fetchTeacherRows(
  supabase: AdminSupabase,
  q: string,
  schoolId = "",
  status: AdminUsersStatusFilter = "",
): Promise<AdminUserTableRow[]> {
  let query = supabase
    .from("school_admin_profiles")
    .select("id, first_name, last_name, email, created_at, is_active, schools(name)");

  query = applyNameEmailSearch(query, q);
  query = applySchoolFilter(query, schoolId);
  query = applyStatusFilter(query, status);

  const { data, error } = await query
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) {
    console.error("[admin-users] school_admin_profiles", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const firstName = row.first_name?.trim() ?? "";
    const lastName = row.last_name?.trim() ?? "";
    return {
      id: row.id,
      firstName,
      lastName,
      email: row.email?.trim() ?? "",
      role: "Teacher",
      school: schoolNameFromEmbed(row.schools),
      lastActiveLabel: "—",
      joinedLabel: formatJoined(row.created_at),
      isActive: row.is_active,
      sortLastName: lastName.toLowerCase(),
      sortFirstName: firstName.toLowerCase(),
    };
  });
}

async function fetchAdvisorRows(
  supabase: AdminSupabase,
  q: string,
  status: AdminUsersStatusFilter = "",
): Promise<AdminUserTableRow[]> {
  let query = supabase.from("advisors").select(ADVISOR_TABLE_SELECT);

  query = applyNameEmailSearch(query, q);
  query = applyStatusFilter(query, status);

  const { data, error } = await query
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) {
    console.error("[admin-users] advisors", error);
    return [];
  }

  return ((data ?? []) as AdvisorTableQueryRow[]).map(mapAdvisorToTableRow);
}

async function fetchAmbassadorRows(
  supabase: AdminSupabase,
  q: string,
  status: AdminUsersStatusFilter = "",
): Promise<AdminUserTableRow[]> {
  let query = supabase.from("ambassadors").select(AMBASSADOR_TABLE_SELECT);

  query = applyNameEmailSearch(query, q);
  query = applyStatusFilter(query, status);

  const { data, error } = await query
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) {
    console.error("[admin-users] ambassadors", error);
    return [];
  }

  return ((data ?? []) as AmbassadorTableQueryRow[]).map(mapAmbassadorToTableRow);
}

async function fetchAdminRows(
  supabase: AdminSupabase,
  q: string,
  status: AdminUsersStatusFilter = "",
): Promise<AdminUserTableRow[]> {
  let query = supabase
    .from("admins")
    .select("id, first_name, last_name, email, role, created_at, is_active");

  query = applyNameEmailSearch(query, q);
  query = applyStatusFilter(query, status);

  const { data, error } = await query
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) {
    console.error("[admin-users] admins", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const firstName = row.first_name?.trim() ?? "";
    const lastName = row.last_name?.trim() ?? "";
    return {
      id: row.id,
      firstName,
      lastName,
      email: row.email?.trim() ?? "",
      role: formatAdminRole(row.role),
      school: "—",
      lastActiveLabel: "—",
      joinedLabel: formatJoined(row.created_at),
      isActive: row.is_active,
      sortLastName: lastName.toLowerCase(),
      sortFirstName: firstName.toLowerCase(),
    };
  });
}

type AdminUsersListTabId = Exclude<UsersTabId, "all" | "handlers">;

async function fetchPaginatedSingleTab(
  supabase: AdminSupabase,
  tabId: AdminUsersListTabId,
  filters: AdminUsersPageFilters,
): Promise<{ rows: AdminUserTableRow[]; totalRows: number }> {
  const page = Math.max(1, filters.page);
  const limit = Math.min(50, Math.max(5, filters.limit));
  const offset = (page - 1) * limit;

  if (tabId === "students") {
    let query = supabase
      .from("student_profiles")
      .select(
        "id, first_name, last_name, email, created_at, is_active, teacher_id, schools(name), school_admin_profiles:teacher_id ( first_name, last_name, email )",
        { count: "exact" },
      );
    query = applyNameEmailSearch(query, filters.q);
    query = applySchoolFilter(query, filters.schoolId);
    query = applyStatusFilter(query, filters.status);
    query = applyStudentTeacherFilter(query, filters.teacher);
    const { data, error, count } = await query
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error || !data) {
      console.error("[admin-users] student_profiles", error);
      return { rows: [], totalRows: 0 };
    }

    const rows = await attachLastActiveFromActivityLogs(
      supabase,
      data.map((row) => {
        const firstName = row.first_name?.trim() ?? "";
        const lastName = row.last_name?.trim() ?? "";
        const teacherEmbedRaw = row.school_admin_profiles as
          | { first_name: string | null; last_name: string | null; email: string | null }
          | { first_name: string | null; last_name: string | null; email: string | null }[]
          | null;
        const teacherEmbed = Array.isArray(teacherEmbedRaw)
          ? (teacherEmbedRaw[0] ?? null)
          : teacherEmbedRaw;
        return {
          id: row.id,
          firstName,
          lastName,
          email: row.email?.trim() ?? "",
          role: "Student",
          school: schoolNameFromEmbed(row.schools),
          lastActiveLabel: "—",
          joinedLabel: formatJoined(row.created_at),
          isActive: row.is_active,
          sortLastName: lastName.toLowerCase(),
          sortFirstName: firstName.toLowerCase(),
          teacherName: teacherNameFromEmbed(teacherEmbed),
        };
      }),
      formatLastActive,
    );

    return { rows, totalRows: count ?? 0 };
  }

  if (tabId === "teachers") {
    let query = supabase
      .from("school_admin_profiles")
      .select(
        "id, first_name, last_name, email, created_at, is_active, schools(name)",
        { count: "exact" },
      );
    query = applyNameEmailSearch(query, filters.q);
    query = applySchoolFilter(query, filters.schoolId);
    query = applyStatusFilter(query, filters.status);
    const { data, error, count } = await query
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error || !data) {
      console.error("[admin-users] school_admin_profiles", error);
      return { rows: [], totalRows: 0 };
    }

    const rows = await attachLastActiveFromActivityLogs(
      supabase,
      data.map((row) => {
        const firstName = row.first_name?.trim() ?? "";
        const lastName = row.last_name?.trim() ?? "";
        return {
          id: row.id,
          firstName,
          lastName,
          email: row.email?.trim() ?? "",
          role: "Teacher",
          school: schoolNameFromEmbed(row.schools),
          lastActiveLabel: "—",
          joinedLabel: formatJoined(row.created_at),
          isActive: row.is_active,
          sortLastName: lastName.toLowerCase(),
          sortFirstName: firstName.toLowerCase(),
        };
      }),
      formatLastActive,
    );

    return { rows, totalRows: count ?? 0 };
  }

  if (tabId === "advisors") {
    let query = supabase.from("advisors").select(ADVISOR_TABLE_SELECT, {
      count: "exact",
    });
    query = applyNameEmailSearch(query, filters.q);
    query = applyStatusFilter(query, filters.status);
    const { data, error, count } = await query
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error || !data) {
      console.error("[admin-users] advisors", error);
      return { rows: [], totalRows: 0 };
    }

    const rows = await attachLastActiveFromActivityLogs(
      supabase,
      (data as AdvisorTableQueryRow[]).map(mapAdvisorToTableRow),
      formatLastActive,
    );

    return { rows, totalRows: count ?? 0 };
  }

  if (tabId === "ambassadors") {
    let query = supabase.from("ambassadors").select(AMBASSADOR_TABLE_SELECT, {
      count: "exact",
    });
    query = applyNameEmailSearch(query, filters.q);
    query = applyStatusFilter(query, filters.status);
    const { data, error, count } = await query
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error || !data) {
      console.error("[admin-users] ambassadors", error);
      return { rows: [], totalRows: 0 };
    }

    const rows = await attachLastActiveFromActivityLogs(
      supabase,
      (data as AmbassadorTableQueryRow[]).map(mapAmbassadorToTableRow),
      formatLastActive,
    );

    return { rows, totalRows: count ?? 0 };
  }

  let query = supabase
    .from("admins")
    .select("id, first_name, last_name, email, role, created_at, is_active", {
      count: "exact",
    });
  query = applyNameEmailSearch(query, filters.q);
  query = applyStatusFilter(query, filters.status);
  const { data, error, count } = await query
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error || !data) {
    console.error("[admin-users] admins", error);
    return { rows: [], totalRows: 0 };
  }

  const rows = await attachLastActiveFromActivityLogs(
    supabase,
    data.map((row) => {
      const firstName = row.first_name?.trim() ?? "";
      const lastName = row.last_name?.trim() ?? "";
      return {
        id: row.id,
        firstName,
        lastName,
        email: row.email?.trim() ?? "",
        role: formatAdminRole(row.role),
        school: "—",
        lastActiveLabel: "—",
        joinedLabel: formatJoined(row.created_at),
        isActive: row.is_active,
        sortLastName: lastName.toLowerCase(),
        sortFirstName: firstName.toLowerCase(),
      };
    }),
    formatLastActive,
  );

  return { rows, totalRows: count ?? 0 };
}

async function fetchAllTab(
  supabase: AdminSupabase,
  filters: AdminUsersPageFilters,
): Promise<{ rows: AdminUserTableRow[]; totalRows: number }> {
  const merged = await fetchAllTabMergedRows(supabase, filters);
  const pageRows = paginateRows(merged, filters.page, filters.limit);
  const rows = await attachLastActiveFromActivityLogs(
    supabase,
    pageRows,
    formatLastActive,
  );

  return {
    rows,
    totalRows: merged.length,
  };
}

export async function fetchAdminUsersPage(
  tabId: UsersTabId,
  filters: AdminUsersPageFilters,
): Promise<{ rows: AdminUserTableRow[]; totalRows: number }> {
  const supabase = await createSupabaseSecretClient();
  const effectiveFilters = getEffectiveAdminUsersFilters(tabId, filters);

  if (tabId === "all") {
    return fetchAllTab(supabase, effectiveFilters);
  }

  if (tabId === "handlers") {
    return { rows: [], totalRows: 0 };
  }

  return fetchPaginatedSingleTab(supabase, tabId, effectiveFilters);
}

function getEffectiveAdminUsersFilters(
  tabId: UsersTabId,
  filters: AdminUsersPageFilters,
): AdminUsersPageFilters {
  return {
    ...filters,
    role: tabId === "all" ? filters.role : "",
    schoolId:
      tabId === "all" || tabId === "students" || tabId === "teachers"
        ? filters.schoolId
        : "",
  };
}

async function fetchAllTabMergedRows(
  supabase: AdminSupabase,
  filters: AdminUsersPageFilters,
): Promise<AdminUserTableRow[]> {
  const { q, role, schoolId, status, teacher } = filters;
  const hasSchool = Boolean(schoolId.trim());
  const fetches: Promise<AdminUserTableRow[]>[] = [];

  if (!role || role === "student") {
    fetches.push(fetchStudentRows(supabase, q, schoolId, status, teacher));
  }
  if (!role || role === "teacher") {
    fetches.push(fetchTeacherRows(supabase, q, schoolId, status));
  }
  if (!role && !hasSchool) {
    fetches.push(fetchAdvisorRows(supabase, q, status));
    fetches.push(fetchAmbassadorRows(supabase, q, status));
    fetches.push(fetchAdminRows(supabase, q, status));
  } else if (role === "advisor") {
    fetches.push(fetchAdvisorRows(supabase, q, status));
  } else if (role === "ambassador") {
    fetches.push(fetchAmbassadorRows(supabase, q, status));
  } else if (role === "admin") {
    fetches.push(fetchAdminRows(supabase, q, status));
  }

  const parts = await Promise.all(fetches);
  return sortRows(parts.flat());
}

export async function fetchAdminUsersExportRows(
  tabId: UsersTabId,
  filters: AdminUsersPageFilters,
): Promise<AdminUserTableRow[]> {
  const supabase = await createSupabaseSecretClient();
  const effectiveFilters = getEffectiveAdminUsersFilters(tabId, filters);

  let rows: AdminUserTableRow[];
  if (tabId === "all") {
    rows = await fetchAllTabMergedRows(supabase, effectiveFilters);
  } else if (tabId === "students") {
    rows = await fetchStudentRows(
      supabase,
      effectiveFilters.q,
      effectiveFilters.schoolId,
      effectiveFilters.status,
      effectiveFilters.teacher,
    );
  } else if (tabId === "teachers") {
    rows = await fetchTeacherRows(
      supabase,
      effectiveFilters.q,
      effectiveFilters.schoolId,
      effectiveFilters.status,
    );
  } else if (tabId === "advisors") {
    rows = await fetchAdvisorRows(supabase, effectiveFilters.q, effectiveFilters.status);
  } else if (tabId === "ambassadors") {
    rows = await fetchAmbassadorRows(supabase, effectiveFilters.q, effectiveFilters.status);
  } else {
    rows = await fetchAdminRows(supabase, effectiveFilters.q, effectiveFilters.status);
  }

  return attachLastActiveFromActivityLogs(supabase, rows, formatLastActive);
}
