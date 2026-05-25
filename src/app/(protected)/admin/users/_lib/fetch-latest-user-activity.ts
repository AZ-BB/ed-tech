import { createSupabaseSecretClient } from "@/utils/supabase-server";

type AdminSupabase = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

type ActivityEnrichedRow = {
  id: string;
  role: string;
  lastActiveLabel: string;
};

type ActivityLogActorColumn = "student_id" | "school_admin_id" | "admin_id";

async function latestActivityForIds(
  supabase: AdminSupabase,
  column: ActivityLogActorColumn,
  ids: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;

  const { data, error } = await supabase
    .from("acitivity_logs")
    .select(`${column}, created_at`)
    .in(column, ids)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(`[admin-users] acitivity_logs.${column}`, error);
    return map;
  }

  for (const row of data ?? []) {
    const id = row[column];
    if (!id || map.has(id)) continue;
    const createdAt = row.created_at;
    if (createdAt) map.set(id, createdAt);
  }

  return map;
}

function isPlatformAdminRole(role: string): boolean {
  return role === "Admin" || role === "Super Admin" || role === "Moderator";
}

export async function attachLastActiveFromActivityLogs<T extends ActivityEnrichedRow>(
  supabase: AdminSupabase,
  rows: T[],
  formatLastActive: (iso: string | null | undefined) => string,
): Promise<T[]> {
  if (rows.length === 0) return rows;

  const studentIds = rows.filter((row) => row.role === "Student").map((row) => row.id);
  const teacherIds = rows.filter((row) => row.role === "Teacher").map((row) => row.id);
  const adminIds = rows
    .filter((row) => isPlatformAdminRole(row.role))
    .map((row) => row.id);

  const [studentActivity, teacherActivity, adminActivity] = await Promise.all([
    latestActivityForIds(supabase, "student_id", studentIds),
    latestActivityForIds(supabase, "school_admin_id", teacherIds),
    latestActivityForIds(supabase, "admin_id", adminIds),
  ]);

  return rows.map((row) => {
    let latestActivity: string | undefined;

    if (row.role === "Student") {
      latestActivity = studentActivity.get(row.id);
    } else if (row.role === "Teacher") {
      latestActivity = teacherActivity.get(row.id);
    } else if (isPlatformAdminRole(row.role)) {
      latestActivity = adminActivity.get(row.id);
    }

    return {
      ...row,
      lastActiveLabel: formatLastActive(latestActivity),
    };
  });
}
