import { createSupabaseServerClient } from "@/utils/supabase-server";

import {
  EMPTY_ADVISOR_DASHBOARD,
  parseAdvisorDashboard,
  type AdvisorDashboardPayload,
} from "./parse-advisor-dashboard";

export type { AdvisorDashboardPayload } from "./parse-advisor-dashboard";

export async function fetchAdvisorDashboard(): Promise<AdvisorDashboardPayload> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("advisor_dashboard");

  if (error) {
    console.error("[fetchAdvisorDashboard]", error.message);
    return EMPTY_ADVISOR_DASHBOARD;
  }

  return parseAdvisorDashboard(data);
}
