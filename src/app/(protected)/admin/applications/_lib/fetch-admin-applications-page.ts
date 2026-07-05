import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import type { Database } from "@/database.types";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import { ADMIN_APPLICATIONS_UNASSIGNED_FILTER } from "./fetch-admin-application-advisor-options";
import type { AdminApplicationsPageFilters } from "./parse-admin-applications-search-params";

export type AdminApplicationTableRow = {
  id: number;
  studentId: string;
  studentName: string;
  studentEmail: string;
  schoolName: string;
  packageLabel: string;
  universitiesLabel: string;
  advisorName: string | null;
  status: string;
  scheduledAt: string | null;
};

type PreferencesUniversities = unknown;

type PersonEmbed =
  | { first_name: string; last_name: string }
  | { first_name: string; last_name: string }[]
  | null;

type AppRowRaw = {
  id: number;
  student_id: string;
  student_name: string | null;
  student_email: string | null;
  status: string | null;
  assigned_to: string | null;
  scheduled_at: string | null;
  preferences_universities: PreferencesUniversities;
  school_name: string | null;
  applications_plans:
    | { name: string; universities_count: number }
    | { name: string; universities_count: number }[]
    | null;
  advisors: PersonEmbed;
  schools: { name: string } | { name: string }[] | null;
  student_profiles:
    | ({ first_name: string; last_name: string; email?: string | null })
    | ({ first_name: string; last_name: string; email?: string | null })[]
    | null;
};

function firstEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

function personNameFromEmbed(embed: PersonEmbed): string | null {
  const person = firstEmbed(embed);
  if (!person) return null;
  const name = [person.first_name, person.last_name].filter(Boolean).join(" ").trim();
  return name || null;
}

function parsePreferencesUniversities(json: PreferencesUniversities): string[] {
  if (!json || !Array.isArray(json)) return [];
  return json
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitStudentName(full: string | null | undefined): {
  first: string;
  last: string;
} {
  const t = full?.trim() ?? "";
  if (!t) return { first: "", last: "" };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { first: parts[0] ?? "", last: "" };
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

function resolveStudentName(row: AppRowRaw): string {
  const profile = firstEmbed(row.student_profiles);
  const fromProfile = personNameFromEmbed(profile);
  if (fromProfile) return fromProfile;

  const fromApplication = row.student_name?.trim();
  if (fromApplication) return fromApplication;

  const split = splitStudentName(row.student_name);
  const combined = [split.first, split.last].filter(Boolean).join(" ").trim();
  return combined || "—";
}

function resolveStudentEmail(row: AppRowRaw): string {
  const profile = firstEmbed(row.student_profiles);
  const fromProfile = profile?.email?.trim();
  if (fromProfile) return fromProfile;
  return row.student_email?.trim() || "—";
}

function resolveSchoolName(row: AppRowRaw): string {
  const school = firstEmbed(row.schools);
  const fromSchool = school?.name?.trim();
  if (fromSchool) return fromSchool;
  return row.school_name?.trim() || "—";
}

function resolvePackageLabel(row: AppRowRaw): string {
  const plan = firstEmbed(row.applications_plans);
  if (!plan) return "—";
  const count = plan.universities_count;
  if (Number.isFinite(count) && count > 0) {
    return `${count} ${count === 1 ? "university" : "universities"}`;
  }
  return plan.name?.trim() || "—";
}

function resolveUniversitiesLabel(row: AppRowRaw): string {
  const unis = parsePreferencesUniversities(row.preferences_universities);
  if (unis.length === 0) return "—";
  return unis.join(", ");
}

function mapApplicationRow(row: AppRowRaw): AdminApplicationTableRow {
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: resolveStudentName(row),
    studentEmail: resolveStudentEmail(row),
    schoolName: resolveSchoolName(row),
    packageLabel: resolvePackageLabel(row),
    universitiesLabel: resolveUniversitiesLabel(row),
    advisorName: personNameFromEmbed(row.advisors),
    status: row.status?.trim() || "lead",
    scheduledAt: row.scheduled_at,
  };
}

export async function fetchAdminApplicationsPage(
  filters: AdminApplicationsPageFilters,
): Promise<{ rows: AdminApplicationTableRow[]; totalRows: number }> {
  const supabase = await createSupabaseSecretClient();
  const { q, status, assignedTo, schoolId, page, limit } = filters;
  const offset = (Math.max(1, page) - 1) * limit;

  let query = supabase
    .from("applications")
    .select(
      `
      id,
      student_id,
      student_name,
      student_email,
      status,
      assigned_to,
      scheduled_at,
      preferences_universities,
      school_name,
      applications_plans ( name, universities_count ),
      advisors:assigned_to ( first_name, last_name ),
      schools ( name ),
      student_profiles ( first_name, last_name, email )
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  const trimmed = q.trim();
  if (trimmed) {
    const e = escapeIlike(trimmed);
    query = query.or(
      `student_name.ilike.%${e}%,student_email.ilike.%${e}%,school_name.ilike.%${e}%`,
    );
  }

  if (status) {
    query = query.eq(
      "status",
      status as Database["public"]["Enums"]["application_status"],
    );
  }

  if (assignedTo === ADMIN_APPLICATIONS_UNASSIGNED_FILTER) {
    query = query.is("assigned_to", null);
  } else if (assignedTo) {
    query = query.eq("assigned_to", assignedTo);
  }

  if (schoolId) {
    query = query.eq("school_id", schoolId);
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error("[fetchAdminApplicationsPage]", error);
    return { rows: [], totalRows: 0 };
  }

  const rows = ((data ?? []) as unknown as AppRowRaw[]).map(mapApplicationRow);

  return {
    rows,
    totalRows: count ?? 0,
  };
}
