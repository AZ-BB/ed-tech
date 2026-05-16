import type { createSupabaseServerClient } from "@/utils/supabase-server";

type SchoolSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** ILIKE pattern for PostgREST filters (includes % wildcards). */
export function ilikePattern(text: string): string {
  const e = escapeIlike(text.trim());
  return `%${e}%`;
}

/**
 * Student IDs at the given school whose name or email matches `text`.
 * Returns an empty array when there are no matches.
 */
export async function fetchSchoolStudentIdsByQuery(
  supabase: SchoolSupabase,
  schoolId: string,
  text: string,
): Promise<string[]> {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const p = ilikePattern(trimmed);
  const { data, error } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("school_id", schoolId)
    .or(`first_name.ilike.${p},last_name.ilike.${p},email.ilike.${p}`);

  if (error) {
    console.error("[fetchSchoolStudentIdsByQuery]", error);
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
    parts.push(`student_id.in.(${studentIds.join(",")})`);
  }
  return parts.join(",");
}
