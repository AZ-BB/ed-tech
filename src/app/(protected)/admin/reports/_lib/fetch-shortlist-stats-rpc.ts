import { createSupabaseSecretClient } from "@/utils/supabase-server";

import { parseAdminReportShortlistTopStats } from "./parse-admin-report-shortlist-stats";
import type { ReportDateBounds } from "./report-date-range";
import type { AdminReportShortlistTopStats } from "./parse-admin-report-shortlist-stats";

export async function fetchAdminReportShortlistStats(
  schoolId: string,
  bounds: ReportDateBounds,
  topN = 10,
): Promise<AdminReportShortlistTopStats> {
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase.rpc("admin_report_shortlist_top_stats", {
    p_school_id: schoolId ?? undefined,
    p_start: bounds.startIso,
    p_end: bounds.endExclusiveIso,
    p_top_n: topN,
  });
  if (error) {
    console.error("[fetchAdminReportShortlistStats]", error.message);
  }
  return parseAdminReportShortlistTopStats(data);
}
