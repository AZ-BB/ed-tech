import { createSupabaseServerClient } from "@/utils/supabase-server";

const PAGE_SIZE = 1000;

type SupabaseServer = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export function utcMonthBounds(reference = new Date()): {
  monthStartIso: string;
  monthEndExclusiveIso: string;
} {
  const y = reference.getUTCFullYear();
  const m = reference.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  const endExclusive = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0));
  return {
    monthStartIso: start.toISOString(),
    monthEndExclusiveIso: endExclusive.toISOString(),
  };
}

async function collectStudentIdsActiveFromActivities(
  supabase: SupabaseServer,
  monthStartIso: string,
  monthEndExclusiveIso: string,
  schoolStudentSet: Set<string>,
): Promise<Set<string>> {
  const active = new Set<string>();
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("student_activities")
      .select("student_id")
      .gte("created_at", monthStartIso)
      .lt("created_at", monthEndExclusiveIso)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error(
        "[schoolActiveStudentsMonth] student_activities:",
        error.message,
      );
      break;
    }
    if (!data?.length) break;
    for (const row of data) {
      if (row.student_id && schoolStudentSet.has(row.student_id)) {
        active.add(row.student_id);
      }
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return active;
}

async function collectStudentIdsActiveFromAiUsage(
  supabase: SupabaseServer,
  monthStartIso: string,
  monthEndExclusiveIso: string,
  schoolStudentSet: Set<string>,
): Promise<Set<string>> {
  const active = new Set<string>();
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("ai_usage")
      .select("student_id")
      .gte("created_at", monthStartIso)
      .lt("created_at", monthEndExclusiveIso)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("[schoolActiveStudentsMonth] ai_usage:", error.message);
      break;
    }
    if (!data?.length) break;
    for (const row of data) {
      if (row.student_id && schoolStudentSet.has(row.student_id)) {
        active.add(row.student_id);
      }
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return active;
}

type ProfileUpdatedAt = { id: string; updated_at: string | null };

/** Counts students active in the current UTC calendar month (aligned with school reports). */
export async function countSchoolActiveStudentsMonth(
  supabase: SupabaseServer,
  schoolStudentSet: Set<string>,
  profiles: ProfileUpdatedAt[],
): Promise<number> {
  const { monthStartIso, monthEndExclusiveIso } = utcMonthBounds();
  const startMs = new Date(monthStartIso).getTime();
  const endMs = new Date(monthEndExclusiveIso).getTime();

  const activeMonth = new Set<string>();
  const [actReal, aiReal] = await Promise.all([
    collectStudentIdsActiveFromActivities(
      supabase,
      monthStartIso,
      monthEndExclusiveIso,
      schoolStudentSet,
    ),
    collectStudentIdsActiveFromAiUsage(
      supabase,
      monthStartIso,
      monthEndExclusiveIso,
      schoolStudentSet,
    ),
  ]);

  for (const id of actReal) activeMonth.add(id);
  for (const id of aiReal) activeMonth.add(id);

  for (const p of profiles) {
    if (!p.updated_at) continue;
    const t = new Date(p.updated_at).getTime();
    if (t >= startMs && t < endMs) activeMonth.add(p.id);
  }

  return activeMonth.size;
}
