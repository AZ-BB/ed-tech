import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminSchoolsStats = {
  activeSchools: number;
  totalStudents: number;
  totalTeachers: number;
  renewalRate: number;
};

async function countSchools(filter?: { is_active?: boolean; subscription_status?: "ACTIVE" }) {
  const supabase = await createSupabaseSecretClient();
  let query = supabase.from("schools").select("id", { count: "exact", head: true });

  if (filter?.is_active !== undefined) {
    query = query.eq("is_active", filter.is_active);
  }
  if (filter?.subscription_status !== undefined) {
    query = query.eq("subscription_status", filter.subscription_status);
  }

  const { count, error } = await query;

  if (error) {
    console.error("[admin-schools] count schools", error);
    return 0;
  }

  return count ?? 0;
}

async function countTable(table: "student_profiles" | "school_admin_profiles") {
  const supabase = await createSupabaseSecretClient();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error(`[admin-schools] count ${table}`, error);
    return 0;
  }

  return count ?? 0;
}

export async function fetchAdminSchoolsStats(): Promise<AdminSchoolsStats> {
  const [activeSchools, totalStudents, totalTeachers, activeSubscriptions, totalSchools] =
    await Promise.all([
      countSchools({ is_active: true }),
      countTable("student_profiles"),
      countTable("school_admin_profiles"),
      countSchools({ subscription_status: "ACTIVE" }),
      countSchools(),
    ]);

  const renewalRate =
    totalSchools > 0 ? Math.round((activeSubscriptions / totalSchools) * 100) : 0;

  return {
    activeSchools,
    totalStudents,
    totalTeachers,
    renewalRate,
  };
}
