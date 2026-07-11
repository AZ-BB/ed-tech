import type { Database } from "@/database.types";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type AdminApplicationsStats = {
  lead: number;
  not_suitable: number;
  payment_requested: number;
  active_package: number;
  /** Unassigned applications (used by admin dashboard, not status cards). */
  unassigned: number;
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
  const [lead, not_suitable, payment_requested, active_package, unassigned] =
    await Promise.all([
      countApplications({ status: "lead" }),
      countApplications({ status: "not_suitable" }),
      countApplications({ status: "payment_requested" }),
      countApplications({ status: "active_package" }),
      countApplications({ assignedToNull: true }),
    ]);

  return {
    lead,
    not_suitable,
    payment_requested,
    active_package,
    unassigned,
  };
}
