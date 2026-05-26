import { formatDistanceToNow } from "date-fns";

import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminScholarshipStudentRow = {
  studentId: string;
  name: string;
  email: string;
  school: string;
  activityLabel: string;
};

type ActivityType = "shortlist" | "save";

type ActivityRow = {
  student_id: string;
  created_at: string | null;
  student_profiles: {
    first_name: string;
    last_name: string;
    email: string;
    schools: { name: string } | { name: string }[] | null;
  } | null;
};

function schoolNameFromEmbed(
  schools: { name: string } | { name: string }[] | null | undefined,
): string {
  if (!schools) return "—";
  if (Array.isArray(schools)) return schools[0]?.name?.trim() || "—";
  return schools.name?.trim() || "—";
}

function formatActivityDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}

export async function fetchAdminScholarshipStudentsPage(
  scholarshipId: string,
  activityType: ActivityType,
  page: number,
  limit: number,
): Promise<{ rows: AdminScholarshipStudentRow[]; totalRows: number }> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase
    .from("student_activities")
    .select(
      "student_id, created_at, student_profiles(first_name, last_name, email, schools(name))",
    )
    .eq("scholarship_id", scholarshipId)
    .eq("entity_type", "scholarship")
    .eq("type", activityType)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin-scholarship-students]", error);
    return { rows: [], totalRows: 0 };
  }

  const seen = new Set<string>();
  const unique: ActivityRow[] = [];

  for (const row of (data ?? []) as ActivityRow[]) {
    if (seen.has(row.student_id)) continue;
    seen.add(row.student_id);
    unique.push(row);
  }

  const offset = (page - 1) * limit;
  const slice = unique.slice(offset, offset + limit);

  const rows: AdminScholarshipStudentRow[] = slice.map((row) => {
    const profile = row.student_profiles;
    const first = profile?.first_name?.trim() ?? "";
    const last = profile?.last_name?.trim() ?? "";
    const name = [first, last].filter(Boolean).join(" ").trim() || profile?.email || "Student";

    return {
      studentId: row.student_id,
      name,
      email: profile?.email?.trim() || "—",
      school: schoolNameFromEmbed(profile?.schools ?? null),
      activityLabel: formatActivityDate(row.created_at),
    };
  });

  return { rows, totalRows: unique.length };
}
