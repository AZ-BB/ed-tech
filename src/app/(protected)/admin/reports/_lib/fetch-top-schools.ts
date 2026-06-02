import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { RankedCount } from "./report-types";

export async function fetchTopSchoolsByStudents(
  topN = 10,
): Promise<RankedCount[]> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("student_profiles")
    .select("school_id, schools(name)")
    .not("school_id", "is", null);

  if (error) {
    console.error("[fetchTopSchoolsByStudents]", error.message);
    return [];
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const school = Array.isArray(row.schools) ? row.schools[0] : row.schools;
    const name = school?.name?.trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, topN)
    .map(([label, count]) => ({ label, count }));
}
