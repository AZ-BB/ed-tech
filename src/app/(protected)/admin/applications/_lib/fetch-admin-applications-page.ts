import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import { getAdminSessionDetailHref } from "@/app/(protected)/admin/sessions/_data/sessions-tabs-data";
import type { Database } from "@/database.types";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import { ADMIN_APPLICATIONS_UNASSIGNED_FILTER } from "./fetch-admin-application-advisor-options";
import type { AdminApplicationsPageFilters } from "./parse-admin-applications-search-params";

type DbClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;
type ApplicationStatus = Database["public"]["Enums"]["application_status"];
type AdvisorSessionStatus = Database["public"]["Enums"]["advisor_session_status"];

type PersonEmbed =
  | { first_name: string; last_name: string }
  | { first_name: string; last_name: string }[]
  | null;

type StudentEmbed =
  | {
      first_name: string;
      last_name: string;
      email?: string | null;
      schools: { name: string } | { name: string }[] | null;
    }
  | {
      first_name: string;
      last_name: string;
      email?: string | null;
      schools: { name: string } | { name: string }[] | null;
    }[]
  | null;

type AppRowRaw = {
  id: number;
  student_id: string;
  student_name: string | null;
  student_email: string | null;
  status: string | null;
  assigned_to: string | null;
  assigned_admin_id: string | null;
  created_at: string | null;
  school_name: string | null;
  advisors: PersonEmbed;
  admins: PersonEmbed;
  schools: { name: string } | { name: string }[] | null;
  student_profiles: StudentEmbed;
};

type AdvisorSessionRowRaw = {
  id: number;
  advisor_id: string;
  status: string | null;
  booked_at: string | null;
  created_at: string | null;
  student_name: string | null;
  student_email: string | null;
  student_profiles: StudentEmbed;
  advisors: PersonEmbed;
};

export type AdminApplicationSupportTableRow =
  | {
      kind: "application_support";
      id: number;
      studentName: string;
      schoolName: string;
      bookedAt: string;
      status: string;
      assigneeKind: "admin" | "advisor" | null;
      assigneeId: string | null;
      assigneeName: string | null;
      detailHref: string;
    }
  | {
      kind: "advisor_session";
      id: number;
      studentName: string;
      schoolName: string;
      bookedAt: string;
      status: string;
      assigneeId: string;
      assigneeName: string;
      detailHref: string;
    };

/** @deprecated Use AdminApplicationSupportTableRow */
export type AdminApplicationTableRow = AdminApplicationSupportTableRow;

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

function resolveStudentName(
  sessionName: string | null | undefined,
  student: { first_name: string; last_name: string } | null,
): string {
  const profileName = student
    ? [student.first_name, student.last_name].filter(Boolean).join(" ").trim()
    : "";
  return sessionName?.trim() || profileName || "Student";
}

function resolveSchoolName(
  student: { schools: { name: string } | { name: string }[] | null } | null,
  fallbackSchoolName?: string | null,
): string {
  const school = student ? firstEmbed(student.schools) : null;
  return school?.name?.trim() || fallbackSchoolName?.trim() || "—";
}

function paginationRange(page: number, limit: number) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const from = (safePage - 1) * safeLimit;
  return { from, to: from + safeLimit - 1 };
}

function paginateRows<T>(rows: T[], page: number, limit: number): T[] {
  const { from, to } = paginationRange(page, limit);
  return rows.slice(from, to + 1);
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
    console.error("[fetchAdminApplicationsPage] school student ids", error);
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

  const { data: schoolMatches } = await client
    .from("schools")
    .select("id")
    .ilike("name", `%${e}%`);

  const schoolIds = (schoolMatches ?? []).map((row) => row.id);

  let profileQuery = client
    .from("student_profiles")
    .select("id")
    .or(`first_name.ilike.%${e}%,last_name.ilike.%${e}%,email.ilike.%${e}%`);

  if (scopedStudentIds) {
    if (scopedStudentIds.length === 0) return [];
    profileQuery = profileQuery.in("id", scopedStudentIds);
  }

  const { data: profileMatches, error: profileError } = await profileQuery;

  if (profileError) {
    console.error("[fetchAdminApplicationsPage] search student profiles", profileError);
  }

  const ids = new Set((profileMatches ?? []).map((row) => row.id));

  if (schoolIds.length > 0) {
    let schoolStudentQuery = client
      .from("student_profiles")
      .select("id")
      .in("school_id", schoolIds);

    if (scopedStudentIds) {
      if (scopedStudentIds.length === 0) return [...ids];
      schoolStudentQuery = schoolStudentQuery.in("id", scopedStudentIds);
    }

    const { data: schoolStudents } = await schoolStudentQuery;
    for (const row of schoolStudents ?? []) {
      ids.add(row.id);
    }
  }

  return [...ids];
}

async function resolveSearchAdvisorIds(q: string, client: DbClient): Promise<string[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];

  const e = escapeIlike(trimmed);
  const { data, error } = await client
    .from("advisors")
    .select("id")
    .or(`first_name.ilike.%${e}%,last_name.ilike.%${e}%`);

  if (error) {
    console.error("[fetchAdminApplicationsPage] search advisors", error);
    return [];
  }

  return (data ?? []).map((row) => row.id);
}

async function resolveSearchAdminIds(q: string, client: DbClient): Promise<string[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];

  const e = escapeIlike(trimmed);
  const { data, error } = await client
    .from("admins")
    .select("id")
    .or(`first_name.ilike.%${e}%,last_name.ilike.%${e}%`);

  if (error) {
    console.error("[fetchAdminApplicationsPage] search admins", error);
    return [];
  }

  return (data ?? []).map((row) => row.id);
}

function buildApplicationSearchOrClause(
  q: string,
  studentIds: string[],
  advisorIds: string[],
  adminIds: string[],
): string | null {
  const trimmed = q.trim();
  if (!trimmed && studentIds.length === 0 && advisorIds.length === 0 && adminIds.length === 0) {
    return null;
  }

  const parts: string[] = [];

  if (trimmed) {
    const e = escapeIlike(trimmed);
    parts.push(`student_name.ilike.%${e}%`, `student_email.ilike.%${e}%`, `school_name.ilike.%${e}%`);
  }

  if (studentIds.length > 0) {
    parts.push(`student_id.in.(${studentIds.join(",")})`);
  }

  if (advisorIds.length > 0) {
    parts.push(`assigned_to.in.(${advisorIds.join(",")})`);
  }

  if (adminIds.length > 0) {
    parts.push(`assigned_admin_id.in.(${adminIds.join(",")})`);
  }

  return parts.length > 0 ? parts.join(",") : null;
}

function buildSessionSearchOrClause(
  q: string,
  studentIds: string[],
  advisorIds: string[],
): string | null {
  const trimmed = q.trim();
  if (!trimmed && studentIds.length === 0 && advisorIds.length === 0) {
    return null;
  }

  const parts: string[] = [];

  if (trimmed) {
    const e = escapeIlike(trimmed);
    parts.push(`student_name.ilike.%${e}%`, `student_email.ilike.%${e}%`);
  }

  if (studentIds.length > 0) {
    parts.push(`student_id.in.(${studentIds.join(",")})`);
  }

  if (advisorIds.length > 0) {
    parts.push(`advisor_id.in.(${advisorIds.join(",")})`);
  }

  return parts.length > 0 ? parts.join(",") : null;
}

function mapApplicationRow(row: AppRowRaw): AdminApplicationSupportTableRow {
  const student = firstEmbed(row.student_profiles);
  const bookedAt = row.created_at ?? new Date(0).toISOString();
  const adminName = personNameFromEmbed(row.admins);
  const advisorName = personNameFromEmbed(row.advisors);

  let assigneeKind: "admin" | "advisor" | null = null;
  let assigneeId: string | null = null;
  let assigneeName: string | null = null;

  if (row.assigned_admin_id) {
    assigneeKind = "admin";
    assigneeId = row.assigned_admin_id;
    assigneeName = adminName;
  } else if (row.assigned_to) {
    assigneeKind = "advisor";
    assigneeId = row.assigned_to;
    assigneeName = advisorName;
  }

  return {
    kind: "application_support",
    id: row.id,
    studentName: resolveStudentName(row.student_name, student),
    schoolName: resolveSchoolName(student, row.school_name),
    bookedAt,
    status: row.status?.trim() || "lead",
    assigneeKind,
    assigneeId,
    assigneeName,
    detailHref: `/admin/applications/${row.id}`,
  };
}

function mapAdvisorSessionRow(row: AdvisorSessionRowRaw): AdminApplicationSupportTableRow {
  const student = firstEmbed(row.student_profiles);
  const bookedAt = row.booked_at ?? row.created_at ?? new Date(0).toISOString();

  return {
    kind: "advisor_session",
    id: row.id,
    studentName: resolveStudentName(row.student_name, student),
    schoolName: resolveSchoolName(student),
    bookedAt,
    status: row.status?.trim() || "pending",
    assigneeId: row.advisor_id,
    assigneeName: personNameFromEmbed(row.advisors) ?? "—",
    detailHref: getAdminSessionDetailHref("advisor", row.id),
  };
}

function matchesAssignedToFilter(
  row: AdminApplicationSupportTableRow,
  assignedTo: string,
): boolean {
  if (assignedTo === ADMIN_APPLICATIONS_UNASSIGNED_FILTER) {
    if (row.kind === "application_support") {
      return row.assigneeId === null;
    }
    return false;
  }

  if (row.kind === "application_support") {
    return row.assigneeId === assignedTo;
  }

  return row.assigneeId === assignedTo;
}

async function fetchApplicationRows(
  client: DbClient,
  filters: AdminApplicationsPageFilters,
): Promise<AdminApplicationSupportTableRow[]> {
  const scopedStudentIds = filters.schoolId
    ? await fetchStudentIdsForSchool(filters.schoolId, client)
    : null;

  if (scopedStudentIds && scopedStudentIds.length === 0) {
    return [];
  }

  const searchStudentIds = await resolveSearchStudentIds(filters.q, client, scopedStudentIds);
  const searchAdvisorIds = await resolveSearchAdvisorIds(filters.q, client);
  const searchAdminIds = await resolveSearchAdminIds(filters.q, client);
  const searchOr = buildApplicationSearchOrClause(
    filters.q,
    searchStudentIds,
    searchAdvisorIds,
    searchAdminIds,
  );

  if (filters.q.trim() && !searchOr) {
    return [];
  }

  let query = client
    .from("applications")
    .select(
      `
      id,
      student_id,
      student_name,
      student_email,
      status,
      assigned_to,
      assigned_admin_id,
      created_at,
      school_name,
      advisors:assigned_to ( first_name, last_name ),
      admins:assigned_admin_id ( first_name, last_name ),
      schools ( name ),
      student_profiles ( first_name, last_name, email, schools ( name ) )
    `,
    )
    .order("created_at", { ascending: false });

  if (scopedStudentIds) {
    query = query.in("student_id", scopedStudentIds);
  }

  if (filters.schoolId) {
    query = query.eq("school_id", filters.schoolId);
  }

  if (filters.status && filters.type === "application_support") {
    query = query.eq("status", filters.status as ApplicationStatus);
  }

  if (filters.assignedTo === ADMIN_APPLICATIONS_UNASSIGNED_FILTER) {
    query = query.is("assigned_to", null).is("assigned_admin_id", null);
  } else if (filters.assignedTo) {
    query = query.or(
      `assigned_to.eq.${filters.assignedTo},assigned_admin_id.eq.${filters.assignedTo}`,
    );
  }

  if (searchOr) {
    query = query.or(searchOr);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[fetchAdminApplicationsPage] applications", error);
    return [];
  }

  return ((data ?? []) as unknown as AppRowRaw[]).map(mapApplicationRow);
}

async function fetchAdvisorSessionRows(
  client: DbClient,
  filters: AdminApplicationsPageFilters,
): Promise<AdminApplicationSupportTableRow[]> {
  const scopedStudentIds = filters.schoolId
    ? await fetchStudentIdsForSchool(filters.schoolId, client)
    : null;

  if (scopedStudentIds && scopedStudentIds.length === 0) {
    return [];
  }

  const searchStudentIds = await resolveSearchStudentIds(filters.q, client, scopedStudentIds);
  const searchAdvisorIds = await resolveSearchAdvisorIds(filters.q, client);
  const searchOr = buildSessionSearchOrClause(filters.q, searchStudentIds, searchAdvisorIds);

  if (filters.q.trim() && !searchOr) {
    return [];
  }

  let query = client
    .from("advisor_sessions")
    .select(
      `
      id,
      advisor_id,
      status,
      booked_at,
      created_at,
      student_name,
      student_email,
      student_profiles ( first_name, last_name, email, schools ( name ) ),
      advisors:advisor_id ( first_name, last_name )
    `,
    )
    .order("created_at", { ascending: false });

  if (scopedStudentIds) {
    query = query.in("student_id", scopedStudentIds);
  }

  if (filters.status && filters.type === "advisor_session") {
    query = query.eq("status", filters.status as AdvisorSessionStatus);
  }

  if (filters.assignedTo && filters.assignedTo !== ADMIN_APPLICATIONS_UNASSIGNED_FILTER) {
    query = query.eq("advisor_id", filters.assignedTo);
  } else if (filters.assignedTo === ADMIN_APPLICATIONS_UNASSIGNED_FILTER) {
    return [];
  }

  if (searchOr) {
    query = query.or(searchOr);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[fetchAdminApplicationsPage] advisor sessions", error);
    return [];
  }

  return ((data ?? []) as unknown as AdvisorSessionRowRaw[]).map(mapAdvisorSessionRow);
}

export async function fetchAdminApplicationsPage(
  filters: AdminApplicationsPageFilters,
): Promise<{ rows: AdminApplicationSupportTableRow[]; totalRows: number }> {
  const supabase = await createSupabaseSecretClient();

  const includeApplications =
    filters.type === "" || filters.type === "application_support";
  const includeSessions = filters.type === "" || filters.type === "advisor_session";

  const [applicationRows, sessionRows] = await Promise.all([
    includeApplications ? fetchApplicationRows(supabase, filters) : Promise.resolve([]),
    includeSessions ? fetchAdvisorSessionRows(supabase, filters) : Promise.resolve([]),
  ]);

  let merged = [...applicationRows, ...sessionRows].sort(
    (a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime(),
  );

  if (filters.assignedTo && filters.type === "") {
    merged = merged.filter((row) => matchesAssignedToFilter(row, filters.assignedTo));
  }

  return {
    rows: paginateRows(merged, filters.page, filters.limit),
    totalRows: merged.length,
  };
}
