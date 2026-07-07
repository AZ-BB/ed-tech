import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import type { Database } from "@/database.types";
import { resolveCurrentAdvisorId } from "@/lib/advisor-access";
import { createSupabaseServerClient } from "@/utils/supabase-server";

import type { AdminPostAdmissionListFilters, AdminPostAdmissionTableRow } from "@/app/(protected)/admin/post-admission/_lib/fetch-admin-post-admission-list";

type PersonEmbed =
  | { first_name: string; last_name: string }
  | { first_name: string; last_name: string }[]
  | null;

type CaseRowRaw = {
  id: number;
  student_name: string | null;
  student_email: string | null;
  school_name: string | null;
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
    status: row.status?.trim() || "lead",
    advisorName: personNameFromEmbed(row.advisors),
    scheduledAt: row.scheduled_at,
    createdAt: row.created_at,
  };
}

export async function fetchAdvisorPostAdmissionList(
  filters: AdminPostAdmissionListFilters,
): Promise<{ rows: AdminPostAdmissionTableRow[]; totalRows: number } | null> {
  const supabase = await createSupabaseServerClient();
  const advisorId = await resolveCurrentAdvisorId(supabase);
  if (!advisorId) return null;

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
      status,
      scheduled_at,
      created_at,
      advisors:assigned_to ( first_name, last_name ),
      schools ( name ),
      student_profiles ( first_name, last_name, email )
    `,
      { count: "exact" },
    )
    .eq("assigned_to", advisorId)
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
      status as Database["public"]["Enums"]["post_admission_status"],
    );
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error("[fetchAdvisorPostAdmissionList]", error);
    return { rows: [], totalRows: 0 };
  }

  return {
    rows: ((data ?? []) as unknown as CaseRowRaw[]).map(mapCaseRow),
    totalRows: count ?? 0,
  };
}
