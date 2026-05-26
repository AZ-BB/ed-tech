import { createSupabaseSecretClient } from "@/utils/supabase-server";

const SCHOLARSHIP_ID_CHUNK = 100;

export async function fetchScholarshipActivityCounts(
  scholarshipIds: string[],
  type: "save" | "shortlist",
): Promise<Map<string, number>> {
  if (scholarshipIds.length === 0) return new Map();

  const supabase = await createSupabaseSecretClient();
  const studentSets = new Map<string, Set<string>>();

  for (let i = 0; i < scholarshipIds.length; i += SCHOLARSHIP_ID_CHUNK) {
    const chunk = scholarshipIds.slice(i, i + SCHOLARSHIP_ID_CHUNK);
    const { data, error } = await supabase
      .from("student_activities")
      .select("scholarship_id, student_id")
      .in("scholarship_id", chunk)
      .eq("type", type)
      .eq("entity_type", "scholarship")
      .not("scholarship_id", "is", null);

    if (error) {
      console.error(`[admin-content] scholarship ${type} counts`, error);
      continue;
    }

    for (const row of data ?? []) {
      const scholarshipId = row.scholarship_id;
      if (!scholarshipId) continue;

      let students = studentSets.get(scholarshipId);
      if (!students) {
        students = new Set();
        studentSets.set(scholarshipId, students);
      }
      students.add(row.student_id);
    }
  }

  const counts = new Map<string, number>();
  for (const [scholarshipId, students] of studentSets) {
    counts.set(scholarshipId, students.size);
  }

  return counts;
}
