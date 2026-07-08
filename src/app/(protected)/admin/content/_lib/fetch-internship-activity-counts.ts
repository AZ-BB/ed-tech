import { createSupabaseSecretClient } from "@/utils/supabase-server";

const INTERNSHIP_ID_CHUNK = 100;

export async function fetchInternshipActivityCounts(
  internshipIds: string[],
): Promise<Map<string, number>> {
  if (internshipIds.length === 0) return new Map();

  const supabase = await createSupabaseSecretClient();
  const studentSets = new Map<string, Set<string>>();

  for (let i = 0; i < internshipIds.length; i += INTERNSHIP_ID_CHUNK) {
    const chunk = internshipIds.slice(i, i + INTERNSHIP_ID_CHUNK);
    const { data, error } = await supabase
      .from("student_activities")
      .select("internship_id, student_id")
      .in("internship_id", chunk)
      .eq("type", "save")
      .eq("entity_type", "internship")
      .not("internship_id", "is", null);

    if (error) {
      console.error("[admin-content] internship save counts", error);
      continue;
    }

    for (const row of data ?? []) {
      const internshipId = row.internship_id;
      if (!internshipId) continue;

      let students = studentSets.get(internshipId);
      if (!students) {
        students = new Set();
        studentSets.set(internshipId, students);
      }
      students.add(row.student_id);
    }
  }

  const counts = new Map<string, number>();
  for (const [internshipId, students] of studentSets) {
    counts.set(internshipId, students.size);
  }

  return counts;
}
