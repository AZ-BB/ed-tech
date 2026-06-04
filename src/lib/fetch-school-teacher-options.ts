import {
  formatSchoolTeacherLabel,
  type StudentTeacherFilterValue,
} from "@/lib/student-teacher-assignment";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

export type SchoolTeacherOption = {
  id: string;
  label: string;
};

type TeacherRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  is_active: boolean;
};

function rowToOption(row: TeacherRow): SchoolTeacherOption {
  return {
    id: row.id,
    label: formatSchoolTeacherLabel(
      row.first_name?.trim() ?? "",
      row.last_name?.trim() ?? "",
      row.email?.trim() ?? "",
    ),
  };
}

/**
 * Active teachers at a school, plus an optional currently assigned teacher if inactive.
 */
export async function fetchSchoolTeacherOptions(
  schoolId: string,
  options?: { includeTeacherId?: string | null; useSecretClient?: boolean },
): Promise<SchoolTeacherOption[]> {
  const sid = schoolId.trim();
  if (!sid) return [];

  const supabase = options?.useSecretClient
    ? await createSupabaseSecretClient()
    : await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("school_admin_profiles")
    .select("id, first_name, last_name, email, is_active")
    .eq("school_id", sid)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) {
    console.error("[fetchSchoolTeacherOptions]", error);
    return [];
  }

  const includeId = options?.includeTeacherId?.trim() || null;
  const byId = new Map<string, SchoolTeacherOption>();

  for (const row of data ?? []) {
    if (row.is_active || row.id === includeId) {
      byId.set(row.id, rowToOption(row as TeacherRow));
    }
  }

  if (includeId && !byId.has(includeId)) {
    const { data: extra } = await supabase
      .from("school_admin_profiles")
      .select("id, first_name, last_name, email, is_active")
      .eq("id", includeId)
      .eq("school_id", sid)
      .maybeSingle();

    if (extra) {
      byId.set(extra.id, rowToOption(extra as TeacherRow));
    }
  }

  return [...byId.values()].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
  );
}

export function applyStudentTeacherFilter<
  T extends { eq: (col: string, val: string) => T; is: (col: string, val: null) => T },
>(query: T, teacher: StudentTeacherFilterValue): T {
  if (!teacher) return query;
  if (teacher === "unassigned") {
    return query.is("teacher_id", null);
  }
  return query.eq("teacher_id", teacher);
}
