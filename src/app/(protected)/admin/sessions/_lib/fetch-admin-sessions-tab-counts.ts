import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { SessionsTabCounts } from "../_data/sessions-tabs-data";

export async function fetchAdminSessionsTabCounts(): Promise<SessionsTabCounts> {
  const supabase = await createSupabaseSecretClient();

  const [
    advisorRes,
    ambassadorRes,
    advisorPendingRes,
    ambassadorPendingRes,
    advisorCompletedRes,
    ambassadorCompletedRes,
  ] = await Promise.all([
    supabase
      .from("advisor_sessions")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("ambassador_session_requests")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("advisor_sessions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("ambassador_session_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("advisor_sessions")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed"),
    supabase
      .from("ambassador_session_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed"),
  ]);

  return {
    advisor: advisorRes.count ?? 0,
    ambassador: ambassadorRes.count ?? 0,
    pending: (advisorPendingRes.count ?? 0) + (ambassadorPendingRes.count ?? 0),
    completed:
      (advisorCompletedRes.count ?? 0) + (ambassadorCompletedRes.count ?? 0),
  };
}
