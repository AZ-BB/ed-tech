import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import type { Database } from "@/database.types";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { SessionsTabId } from "../_data/sessions-tabs-data";
import {
  getEffectiveSessionsFilters,
  type AdminSessionsPageFilters,
} from "./parse-admin-sessions-search-params";

type DbClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;
type AdvisorSessionStatus = Database["public"]["Enums"]["advisor_session_status"];
type AmbassadorSessionStatus =
  Database["public"]["Enums"]["ambassador_session_request_status"];

export type AdminSessionTableRow = {
  id: number;
  kind: "advisor" | "ambassador";
  status: string;
  studentName: string;
  schoolName: string;
  providerName: string;
  occurredAt: string;
};

type PersonEmbed =
  | { first_name: string; last_name: string }
  | { first_name: string; last_name: string }[]
  | null;

type StudentEmbed =
  | {
      first_name: string;
      last_name: string;
      email: string;
      schools: { name: string } | { name: string }[] | null;
    }
  | {
      first_name: string;
      last_name: string;
      email: string;
      schools: { name: string } | { name: string }[] | null;
    }[]
  | null;

function firstEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

function personNameFromEmbed(embed: PersonEmbed): string {
  const person = firstEmbed(embed);
  if (!person) return "—";
  const name = [person.first_name, person.last_name].filter(Boolean).join(" ").trim();
  return name || "—";
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
): string {
  const school = student ? firstEmbed(student.schools) : null;
  return school?.name?.trim() || "—";
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
    console.error("[fetchAdminSessionsPage] school student ids", error);
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
    console.error("[fetchAdminSessionsPage] search student profiles", profileError);
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
    console.error("[fetchAdminSessionsPage] search advisors", error);
    return [];
  }

  return (data ?? []).map((row) => row.id);
}

async function resolveSearchAmbassadorIds(
  q: string,
  client: DbClient,
): Promise<string[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];

  const e = escapeIlike(trimmed);
  const { data, error } = await client
    .from("ambassadors")
    .select("id")
    .or(`first_name.ilike.%${e}%,last_name.ilike.%${e}%`);

  if (error) {
    console.error("[fetchAdminSessionsPage] search ambassadors", error);
    return [];
  }

  return (data ?? []).map((row) => row.id);
}

function buildSessionSearchOrClause(
  q: string,
  studentIds: string[],
  providerIds: string[],
  providerColumn: "advisor_id" | "ambassador_id",
): string | null {
  const trimmed = q.trim();
  if (!trimmed && studentIds.length === 0 && providerIds.length === 0) {
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

  if (providerIds.length > 0) {
    parts.push(`${providerColumn}.in.(${providerIds.join(",")})`);
  }

  return parts.length > 0 ? parts.join(",") : null;
}

type AdvisorRowRaw = {
  id: number;
  status: string | null;
  booked_at: string | null;
  created_at: string | null;
  student_name: string | null;
  student_email: string | null;
  student_profiles: StudentEmbed;
  advisors: PersonEmbed;
};

type AmbassadorRowRaw = {
  id: number;
  status: string | null;
  created_at: string | null;
  student_name: string | null;
  student_email: string | null;
  student_profiles: StudentEmbed;
  ambassadors: PersonEmbed;
};

function isAdvisorSessionStatus(
  status: string,
): status is AdvisorSessionStatus {
  return (
    status === "pending" ||
    status === "confirmed" ||
    status === "completed" ||
    status === "cancelled"
  );
}

function isAmbassadorSessionStatus(
  status: string,
): status is AmbassadorSessionStatus {
  return (
    status === "pending" ||
    status === "confirmed" ||
    status === "completed" ||
    status === "cancelled" ||
    status === "rescheduled"
  );
}
function mapAdvisorRow(row: AdvisorRowRaw): AdminSessionTableRow {
  const student = firstEmbed(row.student_profiles);
  const occurredAt = row.booked_at ?? row.created_at ?? new Date(0).toISOString();

  return {
    id: row.id,
    kind: "advisor",
    status: row.status?.trim() || "pending",
    studentName: resolveStudentName(row.student_name, student),
    schoolName: resolveSchoolName(student),
    providerName: personNameFromEmbed(row.advisors),
    occurredAt,
  };
}

function mapAmbassadorRow(row: AmbassadorRowRaw): AdminSessionTableRow {
  const student = firstEmbed(row.student_profiles);

  return {
    id: row.id,
    kind: "ambassador",
    status: row.status?.trim() || "pending",
    studentName: resolveStudentName(row.student_name, student),
    schoolName: resolveSchoolName(student),
    providerName: personNameFromEmbed(row.ambassadors),
    occurredAt: row.created_at ?? new Date(0).toISOString(),
  };
}

async function fetchAdvisorSessionsRows(
  client: DbClient,
  filters: AdminSessionsPageFilters,
  lockedStatus?: AdvisorSessionStatus,
): Promise<AdminSessionTableRow[]> {
  const scopedStudentIds = filters.schoolId
    ? await fetchStudentIdsForSchool(filters.schoolId, client)
    : null;

  if (scopedStudentIds && scopedStudentIds.length === 0) {
    return [];
  }

  const searchStudentIds = await resolveSearchStudentIds(
    filters.q,
    client,
    scopedStudentIds,
  );
  const searchAdvisorIds = await resolveSearchAdvisorIds(filters.q, client);
  const searchOr = buildSessionSearchOrClause(
    filters.q,
    searchStudentIds,
    searchAdvisorIds,
    "advisor_id",
  );

  if (filters.q.trim() && !searchOr) {
    return [];
  }

  let query = client
    .from("advisor_sessions")
    .select(
      `
      id,
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

  const status =
    lockedStatus ??
    (filters.status && isAdvisorSessionStatus(filters.status) ? filters.status : null);
  if (status) {
    query = query.eq("status", status);
  }

  if (searchOr) {
    query = query.or(searchOr);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[fetchAdminSessionsPage] advisor sessions", error);
    return [];
  }

  return ((data ?? []) as unknown as AdvisorRowRaw[]).map(mapAdvisorRow);
}

async function fetchAdvisorSessionsPageDb(
  client: DbClient,
  filters: AdminSessionsPageFilters,
): Promise<{ rows: AdminSessionTableRow[]; totalRows: number }> {
  const scopedStudentIds = filters.schoolId
    ? await fetchStudentIdsForSchool(filters.schoolId, client)
    : null;

  if (scopedStudentIds && scopedStudentIds.length === 0) {
    return { rows: [], totalRows: 0 };
  }

  const { from, to } = paginationRange(filters.page, filters.limit);

  let query = client
    .from("advisor_sessions")
    .select(
      `
      id,
      status,
      booked_at,
      created_at,
      student_name,
      student_email,
      student_profiles ( first_name, last_name, email, schools ( name ) ),
      advisors:advisor_id ( first_name, last_name )
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (scopedStudentIds) {
    query = query.in("student_id", scopedStudentIds);
  }

  if (filters.status && isAdvisorSessionStatus(filters.status)) {
    query = query.eq("status", filters.status);
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error("[fetchAdminSessionsPage] advisor sessions", error);
    return { rows: [], totalRows: 0 };
  }

  return {
    rows: ((data ?? []) as unknown as AdvisorRowRaw[]).map(mapAdvisorRow),
    totalRows: count ?? 0,
  };
}

async function fetchAmbassadorSessionsRows(
  client: DbClient,
  filters: AdminSessionsPageFilters,
  lockedStatus?: AmbassadorSessionStatus,
): Promise<AdminSessionTableRow[]> {
  const scopedStudentIds = filters.schoolId
    ? await fetchStudentIdsForSchool(filters.schoolId, client)
    : null;

  if (scopedStudentIds && scopedStudentIds.length === 0) {
    return [];
  }

  const searchStudentIds = await resolveSearchStudentIds(
    filters.q,
    client,
    scopedStudentIds,
  );
  const searchAmbassadorIds = await resolveSearchAmbassadorIds(filters.q, client);
  const searchOr = buildSessionSearchOrClause(
    filters.q,
    searchStudentIds,
    searchAmbassadorIds,
    "ambassador_id",
  );

  if (filters.q.trim() && !searchOr) {
    return [];
  }

  let query = client
    .from("ambassador_session_requests")
    .select(
      `
      id,
      status,
      created_at,
      student_name,
      student_email,
      student_profiles ( first_name, last_name, email, schools ( name ) ),
      ambassadors:ambassador_id ( first_name, last_name )
    `,
    )
    .order("created_at", { ascending: false });

  if (scopedStudentIds) {
    query = query.in("student_id", scopedStudentIds);
  }

  const status =
    lockedStatus ??
    (filters.status && isAmbassadorSessionStatus(filters.status)
      ? filters.status
      : null);
  if (status) {
    query = query.eq("status", status);
  }

  if (searchOr) {
    query = query.or(searchOr);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[fetchAdminSessionsPage] ambassador sessions", error);
    return [];
  }

  return ((data ?? []) as unknown as AmbassadorRowRaw[]).map(mapAmbassadorRow);
}

async function fetchAmbassadorSessionsPageDb(
  client: DbClient,
  filters: AdminSessionsPageFilters,
): Promise<{ rows: AdminSessionTableRow[]; totalRows: number }> {
  const scopedStudentIds = filters.schoolId
    ? await fetchStudentIdsForSchool(filters.schoolId, client)
    : null;

  if (scopedStudentIds && scopedStudentIds.length === 0) {
    return { rows: [], totalRows: 0 };
  }

  const { from, to } = paginationRange(filters.page, filters.limit);

  let query = client
    .from("ambassador_session_requests")
    .select(
      `
      id,
      status,
      created_at,
      student_name,
      student_email,
      student_profiles ( first_name, last_name, email, schools ( name ) ),
      ambassadors:ambassador_id ( first_name, last_name )
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (scopedStudentIds) {
    query = query.in("student_id", scopedStudentIds);
  }

  if (filters.status && isAmbassadorSessionStatus(filters.status)) {
    query = query.eq("status", filters.status);
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error("[fetchAdminSessionsPage] ambassador sessions", error);
    return { rows: [], totalRows: 0 };
  }

  return {
    rows: ((data ?? []) as unknown as AmbassadorRowRaw[]).map(mapAmbassadorRow),
    totalRows: count ?? 0,
  };
}

async function fetchAdvisorSessionsPage(
  client: DbClient,
  filters: AdminSessionsPageFilters,
): Promise<{ rows: AdminSessionTableRow[]; totalRows: number }> {
  if (!filters.q.trim()) {
    return fetchAdvisorSessionsPageDb(client, filters);
  }

  const allRows = await fetchAdvisorSessionsRows(client, filters);
  return {
    rows: paginateRows(allRows, filters.page, filters.limit),
    totalRows: allRows.length,
  };
}

async function fetchAmbassadorSessionsPage(
  client: DbClient,
  filters: AdminSessionsPageFilters,
): Promise<{ rows: AdminSessionTableRow[]; totalRows: number }> {
  if (!filters.q.trim()) {
    return fetchAmbassadorSessionsPageDb(client, filters);
  }

  const allRows = await fetchAmbassadorSessionsRows(client, filters);
  return {
    rows: paginateRows(allRows, filters.page, filters.limit),
    totalRows: allRows.length,
  };
}

async function fetchMergedSessionsPage(
  client: DbClient,
  filters: AdminSessionsPageFilters,
  lockedStatus: "pending" | "completed",
): Promise<{ rows: AdminSessionTableRow[]; totalRows: number }> {
  const includeAdvisor = filters.kind !== "ambassador";
  const includeAmbassador = filters.kind !== "advisor";

  const [advisorRows, ambassadorRows] = await Promise.all([
    includeAdvisor
      ? fetchAdvisorSessionsRows(client, filters, lockedStatus)
      : Promise.resolve([]),
    includeAmbassador
      ? fetchAmbassadorSessionsRows(client, filters, lockedStatus)
      : Promise.resolve([]),
  ]);

  const merged = [...advisorRows, ...ambassadorRows].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  return {
    rows: paginateRows(merged, filters.page, filters.limit),
    totalRows: merged.length,
  };
}

export async function fetchAdminSessionsPage(
  tabId: SessionsTabId,
  filters: AdminSessionsPageFilters,
): Promise<{ rows: AdminSessionTableRow[]; totalRows: number }> {
  const supabase = await createSupabaseSecretClient();
  const effectiveFilters = getEffectiveSessionsFilters(tabId, filters);

  switch (tabId) {
    case "advisor":
      return fetchAdvisorSessionsPage(supabase, effectiveFilters);
    case "ambassador":
      return fetchAmbassadorSessionsPage(supabase, effectiveFilters);
    case "pending":
      return fetchMergedSessionsPage(supabase, effectiveFilters, "pending");
    case "completed":
      return fetchMergedSessionsPage(supabase, effectiveFilters, "completed");
  }
}
