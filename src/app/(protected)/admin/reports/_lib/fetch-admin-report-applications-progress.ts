import type { Database } from "@/database.types";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { ReportDateBounds } from "./report-date-range";
import type { ApplicationsProgressPayload } from "./report-payloads";
import type { AdminReportFilters } from "./report-types";
import { buildReportMeta } from "./report-scope";

type ApplicationStatus = Database["public"]["Enums"]["application_status"];

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: "New",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  blocked: "Blocked",
  submitted: "Submitted",
};

const ACTIVE_STATUSES: ApplicationStatus[] = [
  "new",
  "scheduled",
  "in_progress",
  "blocked",
];

export async function fetchAdminReportApplicationsProgress(
  filters: AdminReportFilters,
  bounds: ReportDateBounds,
): Promise<ApplicationsProgressPayload> {
  const supabase = await createSupabaseSecretClient();
  const meta = await buildReportMeta(filters, bounds);

  let appsQuery = supabase
    .from("applications")
    .select(
      "id, status, created_at, school_name, student_id, assigned_to, student_profiles(first_name, last_name), advisors:assigned_to(first_name, last_name)",
    )
    .gte("created_at", bounds.startIso)
    .lt("created_at", bounds.endExclusiveIso)
    .order("created_at", { ascending: false })
    .limit(50);

  if (filters.schoolId) {
    appsQuery = appsQuery.eq("school_id", filters.schoolId);
  }

  let allAppsQuery = supabase.from("applications").select("status");
  if (filters.schoolId) {
    allAppsQuery = allAppsQuery.eq("school_id", filters.schoolId);
  }

  let pendingQuery = supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .is("assigned_to", null)
    .in("status", ACTIVE_STATUSES);
  if (filters.schoolId) {
    pendingQuery = pendingQuery.eq("school_id", filters.schoolId);
  }

  let submittedQuery = supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("status", "submitted")
    .gte("submitted_at", bounds.startIso)
    .lt("submitted_at", bounds.endExclusiveIso);
  if (filters.schoolId) {
    submittedQuery = submittedQuery.eq("school_id", filters.schoolId);
  }

  let startedQuery = supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .gte("created_at", bounds.startIso)
    .lt("created_at", bounds.endExclusiveIso);
  if (filters.schoolId) {
    startedQuery = startedQuery.eq("school_id", filters.schoolId);
  }

  const [allAppsRes, pendingRes, submittedRes, startedRes, recentRes] =
    await Promise.all([
      allAppsQuery,
      pendingQuery,
      submittedQuery,
      startedQuery,
      appsQuery,
    ]);

  const statusCountsMap = new Map<ApplicationStatus, number>();
  for (const status of Object.keys(STATUS_LABELS) as ApplicationStatus[]) {
    statusCountsMap.set(status, 0);
  }
  for (const row of allAppsRes.data ?? []) {
    const s = (row.status?.trim() || "new") as ApplicationStatus;
    statusCountsMap.set(s, (statusCountsMap.get(s) ?? 0) + 1);
  }

  const statusCounts = (Object.keys(STATUS_LABELS) as ApplicationStatus[]).map(
    (status) => ({
      status,
      label: STATUS_LABELS[status],
      count: statusCountsMap.get(status) ?? 0,
    }),
  );

  const recentApplications = (recentRes.data ?? []).map((row) => {
    const student = Array.isArray(row.student_profiles)
      ? row.student_profiles[0]
      : row.student_profiles;
    const advisor = Array.isArray(row.advisors) ? row.advisors[0] : row.advisors;
    const first = student?.first_name?.trim() ?? "";
    const last = student?.last_name?.trim() ?? "";
    const studentName = [first, last].filter(Boolean).join(" ") || "Student";
    const advisorName = advisor
      ? [advisor.first_name, advisor.last_name]
          .map((s) => s?.trim())
          .filter(Boolean)
          .join(" ")
      : "Unassigned";
    const status = (row.status?.trim() || "new") as ApplicationStatus;
    return {
      id: row.id,
      studentName,
      schoolName: row.school_name?.trim() || "—",
      status,
      statusLabel: STATUS_LABELS[status] ?? status,
      advisorName,
      createdAt: row.created_at
        ? new Date(row.created_at).toLocaleDateString("en", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "—",
    };
  });

  return {
    meta,
    statusCounts,
    pendingAssignment: pendingRes.count ?? 0,
    submittedInRange: submittedRes.count ?? 0,
    startedInRange: startedRes.count ?? 0,
    recentApplications,
  };
}
