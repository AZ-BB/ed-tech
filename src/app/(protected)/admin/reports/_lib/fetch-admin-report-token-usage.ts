import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { ReportDateBounds } from "./report-date-range";
import type { TokenUsagePayload } from "./report-payloads";
import type { AdminReportFilters } from "./report-types";
import { buildReportMeta, fetchStudentIdsForSchool } from "./report-scope";

const PAGE_SIZE = 1000;

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    new Date(y, m - 1, d),
  );
}

export async function fetchAdminReportTokenUsage(
  filters: AdminReportFilters,
  bounds: ReportDateBounds,
): Promise<TokenUsagePayload> {
  const supabase = await createSupabaseSecretClient();
  const meta = await buildReportMeta(filters, bounds);
  const studentIds = await fetchStudentIdsForSchool(filters.schoolId);
  const studentSet = new Set(studentIds);

  const schoolNameByStudent = new Map<string, string>();
  if (!filters.schoolId && studentIds.length > 0) {
    for (let i = 0; i < studentIds.length; i += 200) {
      const chunk = studentIds.slice(i, i + 200);
      const { data } = await supabase
        .from("student_profiles")
        .select("id, schools(name)")
        .in("id", chunk);
      for (const row of data ?? []) {
        const school = Array.isArray(row.schools) ? row.schools[0] : row.schools;
        schoolNameByStudent.set(
          row.id,
          school?.name?.trim() || "Unknown school",
        );
      }
    }
  }

  let totalTokens = 0;
  let matchingTokens = 0;
  let essayReviewTokens = 0;
  let matchingCount = 0;
  let essayReviewCount = 0;
  const daily = new Map<string, number>();
  const bySchool = new Map<string, number>();

  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("ai_usage")
      .select("student_id, tokens, type, created_at")
      .gte("created_at", bounds.startIso)
      .lt("created_at", bounds.endExclusiveIso)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("[fetchAdminReportTokenUsage]", error.message);
      break;
    }
    if (!data?.length) break;
    for (const row of data) {
      if (!row.student_id || !studentSet.has(row.student_id)) continue;
      const tokens = row.tokens ?? 0;
      totalTokens += tokens;
      if (row.type === "essay_review") {
        essayReviewTokens += tokens;
        essayReviewCount += 1;
      } else {
        matchingTokens += tokens;
        matchingCount += 1;
      }
      if (row.created_at) {
        const dk = dayKey(row.created_at);
        daily.set(dk, (daily.get(dk) ?? 0) + tokens);
      }
      if (!filters.schoolId) {
        const schoolName =
          schoolNameByStudent.get(row.student_id) ?? "Unknown school";
        bySchool.set(schoolName, (bySchool.get(schoolName) ?? 0) + tokens);
      }
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const dailyUsage = [...daily.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, tokens]) => ({ label: formatDayLabel(key), tokens }));

  const bySchoolList = [...bySchool.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([label, tokens]) => ({ label, tokens }));

  return {
    meta,
    totalTokens,
    matchingTokens,
    essayReviewTokens,
    matchingCount,
    essayReviewCount,
    dailyUsage,
    bySchool: bySchoolList,
  };
}
