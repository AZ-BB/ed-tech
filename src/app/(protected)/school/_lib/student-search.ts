import type { createSupabaseServerClient } from "@/utils/supabase-server";
import { applyStudentTeacherFilter } from "@/lib/fetch-school-teacher-options";

type SchoolSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** ILIKE pattern for PostgREST filters (includes % wildcards). */
export function ilikePattern(text: string): string {
  const e = escapeIlike(text.trim());
  return `%${e}%`;
}

/** Comma-separated `column.ilike.%term%` clauses for use inside `.or()`. */
export function orIlikeClause(columns: string[], text: string): string {
  const e = escapeIlike(text.trim());
  return columns.map((col) => `${col}.ilike.%${e}%`).join(",");
}

/**
 * PostgREST `.or()` filter for tables with first_name, last_name, and email.
 * Multi-word queries match first + last name (e.g. "Jane Doe").
 */
export function nameEmailSearchOrFilter(q: string): string | null {
  const trimmed = q.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(/\s+/).filter(Boolean);
  const anyField = orIlikeClause(["first_name", "last_name", "email"], trimmed);

  if (parts.length >= 2) {
    const first = escapeIlike(parts[0]!);
    const last = escapeIlike(parts.slice(1).join(" "));
    return `and(first_name.ilike.%${first}%,last_name.ilike.%${last}%),${anyField}`;
  }

  return anyField;
}

/** Applies {@link nameEmailSearchOrFilter} to a Supabase query builder. */
export function applyNameEmailSearch<T extends { or: (filter: string) => T }>(
  query: T,
  q: string,
): T {
  const filter = nameEmailSearchOrFilter(q);
  if (!filter) return query;
  return query.or(filter);
}

function applySchoolScope<T extends { eq: (column: string, value: string) => T }>(
  query: T,
  schoolId?: string,
): T {
  const id = schoolId?.trim();
  if (!id) return query;
  return query.eq("school_id", id);
}

function mergeStudentIds(...lists: (string[] | undefined)[]): string[] {
  const seen = new Set<string>();
  for (const list of lists) {
    for (const id of list ?? []) {
      seen.add(id);
    }
  }
  return [...seen];
}

/**
 * Student IDs whose name or email matches `text`.
 * When `schoolId` is provided, limits to that school; otherwise searches all students.
 * Multi-word queries match first_name + last_name (e.g. "Jane Doe").
 */
export async function fetchSchoolStudentIdsByQuery(
  supabase: SchoolSupabase,
  schoolId: string,
  text: string,
  teacherId?: string,
): Promise<string[]> {
  return fetchStudentIdsByQuery(supabase, text, schoolId, teacherId);
}

export async function fetchStudentIdsByQuery(
  supabase: SchoolSupabase,
  text: string,
  schoolId?: string,
  teacherId?: string,
): Promise<string[]> {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const parts = trimmed.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    const first = escapeIlike(parts[0]!);
    const last = escapeIlike(parts.slice(1).join(" "));

    let byFirstLast = supabase
      .from("student_profiles")
      .select("id")
      .ilike("first_name", `%${first}%`)
      .ilike("last_name", `%${last}%`);
    byFirstLast = applySchoolScope(byFirstLast, schoolId);
    byFirstLast = applyStudentTeacherFilter(byFirstLast, teacherId?.trim() ?? "");

    let byAnyField = supabase
      .from("student_profiles")
      .select("id")
      .or(orIlikeClause(["first_name", "last_name", "email"], trimmed));
    byAnyField = applySchoolScope(byAnyField, schoolId);
    byAnyField = applyStudentTeacherFilter(byAnyField, teacherId?.trim() ?? "");

    const [firstLastRes, anyFieldRes] = await Promise.all([
      byFirstLast,
      byAnyField,
    ]);

    if (firstLastRes.error) {
      console.error("[fetchStudentIdsByQuery] first+last", firstLastRes.error);
    }
    if (anyFieldRes.error) {
      console.error("[fetchStudentIdsByQuery] any field", anyFieldRes.error);
    }

    return mergeStudentIds(
      firstLastRes.data?.map((r) => r.id),
      anyFieldRes.data?.map((r) => r.id),
    );
  }

  let query = supabase
    .from("student_profiles")
    .select("id")
    .or(orIlikeClause(["first_name", "last_name", "email"], trimmed));
  query = applySchoolScope(query, schoolId);
  query = applyStudentTeacherFilter(query, teacherId?.trim() ?? "");

  const { data, error } = await query;

  if (error) {
    console.error("[fetchStudentIdsByQuery]", error);
    return [];
  }

  return (data ?? []).map((r) => r.id);
}

/** Builds a single-table `.or()` filter: doc/task fields plus optional student_id.in. */
export function buildOrWithStudentIds(
  fieldPatterns: string[],
  studentIds: string[],
): string {
  const parts = [...fieldPatterns];
  if (studentIds.length > 0) {
    const inList = studentIds.map((id) => `"${id}"`).join(",");
    parts.push(`student_id.in.(${inList})`);
  }
  return parts.join(",");
}
