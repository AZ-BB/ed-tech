import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { AdminAmbassadorSpecificRequestsPageFilters } from "./parse-admin-ambassador-specific-requests-search-params";

type DbClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

type SchoolEmbed = { name: string } | { name: string }[] | null;

type RowRaw = {
  id: number;
  status: string;
  student_name: string;
  student_email: string;
  target_university: string;
  preferred_major: string | null;
  created_at: string | null;
  student_profiles: { schools: SchoolEmbed } | { schools: SchoolEmbed }[] | null;
};

export type AdminAmbassadorSpecificRequestTableRow = {
  id: number;
  studentName: string;
  studentEmail: string;
  schoolName: string;
  targetUniversity: string;
  preferredMajor: string | null;
  status: string;
  createdAt: string;
};

function firstEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

function paginationRange(page: number, limit: number) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const from = (safePage - 1) * safeLimit;
  return { from, to: from + safeLimit - 1 };
}

async function fetchStudentIdsForSchool(
  schoolId: string,
  client: DbClient,
): Promise<string[]> {
  const { data, error } = await client
    .from("student_profiles")
    .select("id")
    .eq("school_id", schoolId);

  if (error) {
    console.error("[fetchAdminAmbassadorSpecificRequestsPage] school student ids", error);
    return [];
  }

  return (data ?? []).map((row) => row.id);
}

async function resolveSearchStudentIds(
  q: string,
  client: DbClient,
  scopedStudentIds: string[] | null,
): Promise<string[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];

  const e = escapeIlike(trimmed);

  let query = client
    .from("student_profiles")
    .select("id")
    .or(
      `first_name.ilike.%${e}%,last_name.ilike.%${e}%,email.ilike.%${e}%`,
    );

  if (scopedStudentIds) {
    query = query.in("id", scopedStudentIds);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[fetchAdminAmbassadorSpecificRequestsPage] search students", error);
    return [];
  }

  return (data ?? []).map((row) => row.id);
}

function buildSearchOrClause(
  q: string,
  searchStudentIds: string[],
): string | null {
  const trimmed = q.trim();
  if (!trimmed && searchStudentIds.length === 0) {
    return null;
  }

  const parts: string[] = [];

  if (trimmed) {
    const e = escapeIlike(trimmed);
    parts.push(
      `student_name.ilike.%${e}%`,
      `student_email.ilike.%${e}%`,
      `target_university.ilike.%${e}%`,
      `preferred_major.ilike.%${e}%`,
    );
  }

  if (searchStudentIds.length > 0) {
    parts.push(`student_id.in.(${searchStudentIds.join(",")})`);
  }

  return parts.length > 0 ? parts.join(",") : null;
}

function mapRow(row: RowRaw): AdminAmbassadorSpecificRequestTableRow {
  const student = firstEmbed(row.student_profiles);
  const school = student ? firstEmbed(student.schools) : null;

  return {
    id: row.id,
    studentName: row.student_name?.trim() || "—",
    studentEmail: row.student_email?.trim() || "—",
    schoolName: school?.name?.trim() || "—",
    targetUniversity: row.target_university?.trim() || "—",
    preferredMajor: row.preferred_major?.trim() || null,
    status: row.status?.trim() || "pending",
    createdAt: row.created_at ?? new Date(0).toISOString(),
  };
}

export async function fetchAdminAmbassadorSpecificRequestsPage(
  filters: AdminAmbassadorSpecificRequestsPageFilters,
): Promise<{
  rows: AdminAmbassadorSpecificRequestTableRow[];
  totalRows: number;
}> {
  const client = await createSupabaseSecretClient();

  const scopedStudentIds = filters.schoolId
    ? await fetchStudentIdsForSchool(filters.schoolId, client)
    : null;

  if (scopedStudentIds && scopedStudentIds.length === 0) {
    return { rows: [], totalRows: 0 };
  }

  const searchStudentIds = await resolveSearchStudentIds(
    filters.q,
    client,
    scopedStudentIds,
  );
  const searchOr = buildSearchOrClause(filters.q, searchStudentIds);

  if (filters.q.trim() && !searchOr) {
    return { rows: [], totalRows: 0 };
  }

  const { from, to } = paginationRange(filters.page, filters.limit);

  let query = client
    .from("ambassador_specific_requests")
    .select(
      `
      id,
      status,
      student_name,
      student_email,
      target_university,
      preferred_major,
      created_at,
      student_profiles ( schools ( name ) )
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (scopedStudentIds) {
    query = query.in("student_id", scopedStudentIds);
  }

  if (filters.status === "pending") {
    query = query.eq("status", "pending");
  }

  if (searchOr) {
    query = query.or(searchOr);
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error("[fetchAdminAmbassadorSpecificRequestsPage]", error);
    return { rows: [], totalRows: 0 };
  }

  return {
    rows: ((data ?? []) as unknown as RowRaw[]).map(mapRow),
    totalRows: count ?? 0,
  };
}
