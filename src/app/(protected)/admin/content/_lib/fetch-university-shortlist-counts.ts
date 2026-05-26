import { createSupabaseSecretClient } from "@/utils/supabase-server";

const UNIVERSITY_ID_CHUNK = 100;

export async function fetchUniversityShortlistCounts(
  universityIds: string[],
): Promise<Map<string, number>> {
  if (universityIds.length === 0) return new Map();

  const supabase = await createSupabaseSecretClient();
  const studentSets = new Map<string, Set<string>>();

  for (let i = 0; i < universityIds.length; i += UNIVERSITY_ID_CHUNK) {
    const chunk = universityIds.slice(i, i + UNIVERSITY_ID_CHUNK);
    const { data, error } = await supabase
      .from("student_activities")
      .select("uni_id, student_id")
      .in("uni_id", chunk)
      .eq("type", "shortlist")
      .eq("entity_type", "university")
      .not("uni_id", "is", null);

    if (error) {
      console.error("[admin-content] university shortlist counts", error);
      continue;
    }

    for (const row of data ?? []) {
      const uniId = row.uni_id;
      if (!uniId) continue;

      let students = studentSets.get(uniId);
      if (!students) {
        students = new Set();
        studentSets.set(uniId, students);
      }
      students.add(row.student_id);
    }
  }

  const counts = new Map<string, number>();
  for (const [uniId, students] of studentSets) {
    counts.set(uniId, students.size);
  }

  return counts;
}
