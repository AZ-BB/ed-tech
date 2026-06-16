import type { Database } from "@/database.types";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminApplicationsStats = {
  activeCases: number;
  pendingAssignment: number;
  inProgress: number;
  submitted: number;
};

type ApplicationStatus = Database["public"]["Enums"]["application_status"];

async function countApplications(filter?: {
  status?: ApplicationStatus | ApplicationStatus[];
  assignedToNull?: boolean;
}): Promise<number> {
  const supabase = await createSupabaseSecretClient();
  let query = supabase
    .from("applications")
    .select("id", { count: "exact", head: true });

  if (filter?.status !== undefined) {
    if (Array.isArray(filter.status)) {
      query = query.in("status", filter.status);
    } else {
      query = query.eq("status", filter.status);
    }
  }

  if (filter?.assignedToNull) {
    query = query.is("assigned_to", null);
  }

  const { count, error } = await query;

  if (error) {
    console.error("[admin-applications] count", error);
    return 0;
  }

  return count ?? 0;
}

export async function fetchAdminApplicationsStats(): Promise<AdminApplicationsStats> {
  const [activeCases, pendingAssignment, inProgress, submitted] =
    await Promise.all([
      countApplications({
        status: ["new", "scheduled", "in_progress", "blocked"],
      }),
      countApplications({ assignedToNull: true }),
      countApplications({ status: "in_progress" }),
      countApplications({ status: "submitted" }),
    ]);

  return {
    activeCases,
    pendingAssignment,
    inProgress,
    submitted,
  };
}
