import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import type { Database } from "@/database.types";
import { formatPostAdmissionServiceLabel } from "@/lib/post-admission-services";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminPostAdmissionTableRow = {
  id: number;
  studentName: string;
  studentEmail: string;
  schoolName: string;
  serviceLabel: string;
  status: string;
  advisorName: string | null;
  scheduledAt: string | null;
  createdAt: string;
};

export type AdminPostAdmissionListFilters = {
  q: string;
  status: Database["public"]["Enums"]["post_admission_status"] | "";
  page: number;
  limit: number;
};

type PersonEmbed =
  | { first_name: string; last_name: string }
  | { first_name: string; last_name: string }[]
  | null;

type CaseRowRaw = {
  id: number;
  student_name: string | null;
  student_email: string | null;
  school_name: string | null;
  selected_service: string | null;
  service_other_detail: string | null;
  status: string | null;
  scheduled_at: string | null;
  created_at: string;
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

function resolveStudentName(row: CaseRowRaw): string {
  const profile = firstEmbed(row.student_profiles);
  const fromProfile = personNameFromEmbed(profile);
  if (fromProfile) return fromProfile;
  return row.student_name?.trim() || "—";
}

function resolveStudentEmail(row: CaseRowRaw): string {
  const profile = firstEmbed(row.student_profiles);
  const fromProfile = profile?.email?.trim();
  if (fromProfile) return fromProfile;
  return row.student_email?.trim() || "—";
}

function resolveSchoolName(row: CaseRowRaw): string {
  const school = firstEmbed(row.schools);
  const fromSchool = school?.name?.trim();
  if (fromSchool) return fromSchool;
  return row.school_name?.trim() || "—";
}

function mapCaseRow(row: CaseRowRaw): AdminPostAdmissionTableRow {
  return {
    id: row.id,
    studentName: resolveStudentName(row),
    studentEmail: resolveStudentEmail(row),
    schoolName: resolveSchoolName(row),
    serviceLabel: formatPostAdmissionServiceLabel(
      row.selected_service,
      row.service_other_detail,
    ),
    status: row.status?.trim() || "lead",
    advisorName: personNameFromEmbed(row.advisors),
    scheduledAt: row.scheduled_at,
    createdAt: row.created_at,
  };
}

export async function fetchAdminPostAdmissionList(
  filters: AdminPostAdmissionListFilters,
): Promise<{ rows: AdminPostAdmissionTableRow[]; totalRows: number }> {
  const supabase = await createSupabaseSecretClient();
  const { q, status, page, limit } = filters;
  const offset = (Math.max(1, page) - 1) * limit;

  let query = supabase
    .from("post_admission_cases")
    .select(
      `
      id,
      student_name,
      student_email,
      school_name,
      selected_service,
      service_other_detail,
      status,
      scheduled_at,
      created_at,
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
    query = query.eq("status", status);
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error("[fetchAdminPostAdmissionList]", error);
    return { rows: [], totalRows: 0 };
  }

  return {
    rows: ((data ?? []) as unknown as CaseRowRaw[]).map(mapCaseRow),
    totalRows: count ?? 0,
  };
}
