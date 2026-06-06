import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { UsersTabCounts } from "../_data/users-tabs-data";

async function countTable(
  table:
    | "student_profiles"
    | "school_admin_profiles"
    | "advisors"
    | "ambassadors"
    | "admins"
    | "handlers",
) {
  const supabase = await createSupabaseSecretClient();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error(`[admin-users] count ${table}`, error);
    return 0;
  }

  return count ?? 0;
}

export async function fetchUsersTabCounts(): Promise<UsersTabCounts> {
  const [students, teachers, advisors, ambassadors, admins, handlers] = await Promise.all([
    countTable("student_profiles"),
    countTable("school_admin_profiles"),
    countTable("advisors"),
    countTable("ambassadors"),
    countTable("admins"),
    countTable("handlers"),
  ]);

  const all = students + teachers + advisors + ambassadors + admins;

  return {
    all,
    students,
    teachers,
    advisors,
    ambassadors,
    admins,
    handlers,
  };
}
