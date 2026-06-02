import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { ReportDateBounds } from "./report-date-range";
import {
  ADMIN_REPORT_TYPE_LABELS,
  type AdminReportFilters,
  type AdminReportMeta,
} from "./report-types";

const PAGE_SIZE = 1000;
const STUDENT_CHUNK = 150;

type SupabaseSecret = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export async function resolveSchoolName(schoolId: string): Promise<string> {
  if (!schoolId) return "All Schools";
  const supabase = await createSupabaseSecretClient();
  const { data } = await supabase
    .from("schools")
    .select("name")
    .eq("id", schoolId)
    .maybeSingle();
  return data?.name?.trim() || "School";
}

export async function fetchStudentIdsForSchool(
  schoolId: string,
): Promise<string[]> {
  const supabase = await createSupabaseSecretClient();
  let query = supabase.from("student_profiles").select("id");
  if (schoolId) query = query.eq("school_id", schoolId);
  const { data, error } = await query;
  if (error) {
    console.error("[report-scope] student_profiles", error.message);
    return [];
  }
  return (data ?? []).map((r) => r.id).filter(Boolean);
}

export async function buildReportMeta(
  filters: AdminReportFilters,
  bounds: ReportDateBounds,
): Promise<AdminReportMeta> {
  const schoolName = await resolveSchoolName(filters.schoolId);
  return {
    reportType: filters.reportType,
    reportTypeLabel: ADMIN_REPORT_TYPE_LABELS[filters.reportType],
    schoolId: filters.schoolId,
    schoolName,
    startDate: bounds.startDate,
    endDate: bounds.endDate,
    rangeLabel: bounds.rangeLabel,
    generatedAt: new Date().toISOString(),
  };
}

export async function collectActiveStudentIdsInRange(
  supabase: SupabaseSecret,
  studentIds: string[],
  studentSet: Set<string>,
  startIso: string,
  endExclusiveIso: string,
): Promise<Set<string>> {
  const active = new Set<string>();
  if (studentIds.length === 0) return active;

  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("student_activities")
      .select("student_id")
      .gte("created_at", startIso)
      .lt("created_at", endExclusiveIso)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("[report-scope] student_activities", error.message);
      break;
    }
    if (!data?.length) break;
    for (const row of data) {
      if (row.student_id && studentSet.has(row.student_id)) {
        active.add(row.student_id);
      }
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("ai_usage")
      .select("student_id")
      .gte("created_at", startIso)
      .lt("created_at", endExclusiveIso)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("[report-scope] ai_usage", error.message);
      break;
    }
    if (!data?.length) break;
    for (const row of data) {
      if (row.student_id && studentSet.has(row.student_id)) {
        active.add(row.student_id);
      }
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endExclusiveIso).getTime();
  for (let i = 0; i < studentIds.length; i += STUDENT_CHUNK) {
    const chunk = studentIds.slice(i, i + STUDENT_CHUNK);
    const { data, error } = await supabase
      .from("student_profiles")
      .select("id, updated_at")
      .in("id", chunk);
    if (error) continue;
    for (const row of data ?? []) {
      if (!row.updated_at) continue;
      const t = new Date(row.updated_at).getTime();
      if (t >= startMs && t < endMs) active.add(row.id);
    }
  }

  return active;
}

export async function countInRangeForStudents(
  supabase: SupabaseSecret,
  table: "advisor_sessions" | "ambassador_session_requests",
  studentIds: string[],
  startIso: string,
  endExclusiveIso: string,
): Promise<number> {
  if (studentIds.length === 0) return 0;
  let total = 0;
  for (let i = 0; i < studentIds.length; i += STUDENT_CHUNK) {
    const chunk = studentIds.slice(i, i + STUDENT_CHUNK);
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .in("student_id", chunk)
      .gte("created_at", startIso)
      .lt("created_at", endExclusiveIso);
    if (error) {
      console.error(`[report-scope] ${table}`, error.message);
      continue;
    }
    total += count ?? 0;
  }
  return total;
}

export async function countAiUsageInRange(
  supabase: SupabaseSecret,
  studentIds: string[],
  startIso: string,
  endExclusiveIso: string,
  type?: "matching" | "essay_review",
): Promise<number> {
  if (studentIds.length === 0) return 0;
  let total = 0;
  for (let i = 0; i < studentIds.length; i += STUDENT_CHUNK) {
    const chunk = studentIds.slice(i, i + STUDENT_CHUNK);
    let query = supabase
      .from("ai_usage")
      .select("*", { count: "exact", head: true })
      .in("student_id", chunk)
      .gte("created_at", startIso)
      .lt("created_at", endExclusiveIso);
    if (type) query = query.eq("type", type);
    const { count, error } = await query;
    if (error) {
      console.error("[report-scope] ai_usage count", error.message);
      continue;
    }
    total += count ?? 0;
  }
  return total;
}
