import { parseSchoolStudentsNeedingFollowUp } from "@/lib/school-student-risk";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { ReportDateBounds } from "./report-date-range";
import type { AtRiskStudentsPayload } from "./report-payloads";
import type { AdminReportFilters } from "./report-types";
import { buildReportMeta } from "./report-scope";

export async function fetchAdminReportAtRiskStudents(
  filters: AdminReportFilters,
  bounds: ReportDateBounds,
): Promise<AtRiskStudentsPayload> {
  const meta = await buildReportMeta(filters, bounds);
  const supabase = await createSupabaseSecretClient();
  const { data, error } = await supabase.rpc("admin_students_at_risk", {
    p_school_id: filters.schoolId || null,
    p_limit: 0,
  });
  if (error) {
    console.error("[fetchAdminReportAtRiskStudents]", error.message);
  }
  const parsed = parseSchoolStudentsNeedingFollowUp(data);
  const schoolNameById = new Map<string, string>();
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const root = data as Record<string, unknown>;
    if (Array.isArray(root.students)) {
      for (const item of root.students) {
        if (!item || typeof item !== "object") continue;
        const r = item as Record<string, unknown>;
        const id = typeof r.id === "string" ? r.id : "";
        const sn =
          typeof r.school_name === "string" ? r.school_name.trim() : "";
        if (id) schoolNameById.set(id, sn);
      }
    }
  }

  const students = parsed.students.map((s) => ({
    id: s.id,
    firstName: s.first_name.trim(),
    lastName: s.last_name.trim(),
    grade: s.grade,
    schoolName: schoolNameById.get(s.id) ?? "",
    riskClass: s.risk_class,
    riskLabel: s.risk_label,
    issue: s.issue,
  }));

  return {
    meta,
    needAttentionCount: parsed.need_attention_count,
    students,
  };
}
