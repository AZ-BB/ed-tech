import {
  type AdvisorStudentManagementStatus,
  type AdvisorStudentStatusFilter,
  type DestinationPill,
} from "@/lib/advisor-student-derivations";
import { resolveCurrentAdvisorId } from "@/lib/advisor-access";
import {
  fetchAdvisorStudentApplicationGroups,
  studentApplicationOptionsByStudentId,
  type AdvisorStudentApplicationOption,
} from "@/lib/advisor-student-application-options";
import { createSupabaseServerClient } from "@/utils/supabase-server";

type RpcRow = {
  student_id: string;
  student_name: string;
  student_email: string;
  school_name: string;
  management_status: AdvisorStudentManagementStatus;
  destinations: DestinationPill[] | null;
  initial_meeting_date: string | null;
  package_purchased: string | null;
  deadline_risk_level: "ok" | "soon" | "urgent" | "none";
  deadline_risk_label: string;
  latest_updated_at: string | null;
};

export type AdvisorStudentRow = {
  studentId: string;
  studentName: string;
  studentInitials: string;
  studentEmail: string;
  schoolName: string;
  managementStatus: AdvisorStudentManagementStatus;
  destinations: DestinationPill[];
  initialMeetingDate: string | null;
  packagePurchased: string;
  deadlineRiskLevel: "ok" | "soon" | "urgent" | "none";
  deadlineRiskLabel: string;
  latestUpdatedAt: string | null;
};

export type AdvisorStudentsPanelProps = {
  rows: AdvisorStudentRow[];
  totalRows: number;
  page: number;
  limit: number;
  search: string;
  status: AdvisorStudentStatusFilter;
  statusCounts: Record<AdvisorStudentStatusFilter, number>;
  studentApplicationOptions: Record<string, AdvisorStudentApplicationOption[]>;
};

const EMPTY_STATUS_COUNTS: Record<AdvisorStudentStatusFilter, number> = {
  all: 0,
  lead: 0,
  payment_requested: 0,
  active_package: 0,
};

function studentInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  const pair = `${a}${b}`.toUpperCase();
  return pair || "?";
}

export function parseAdvisorStudentsSearch(
  raw: string | string[] | undefined,
): string {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  return value?.trim() ?? "";
}

export async function fetchAdvisorStudentsPanel(options: {
  page: number;
  limit: number;
  search: string;
  status: AdvisorStudentStatusFilter;
}): Promise<AdvisorStudentsPanelProps | null> {
  const supabase = await createSupabaseServerClient();
  const advisorId = await resolveCurrentAdvisorId(supabase);

  const emptyPanel = {
    rows: [],
    totalRows: 0,
    page: options.page,
    limit: options.limit,
    search: options.search,
    status: options.status,
    statusCounts: { ...EMPTY_STATUS_COUNTS },
    studentApplicationOptions: {},
  };

  if (!advisorId) {
    return null;
  }

  const [rpcResult, applicationGroups] = await Promise.all([
    (supabase as unknown as {
      rpc: (
        fn: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    }).rpc("advisor_students_table_rows"),
    fetchAdvisorStudentApplicationGroups(supabase, advisorId),
  ]);

  const { data, error } = rpcResult;
  const studentApplicationOptions =
    studentApplicationOptionsByStudentId(applicationGroups);

  if (error) {
    console.error("[fetchAdvisorStudentsPanel] rpc", error);
    return { ...emptyPanel, studentApplicationOptions };
  }

  const rpcRows = (data ?? []) as unknown as RpcRow[];
  const allRows: AdvisorStudentRow[] = rpcRows.map((row) => ({
    studentId: row.student_id,
    studentName: row.student_name?.trim() || "Student",
    studentInitials: studentInitials(row.student_name?.trim() || "Student"),
    studentEmail: row.student_email?.trim() || "—",
    schoolName: row.school_name?.trim() || "—",
    managementStatus: row.management_status,
    destinations: Array.isArray(row.destinations) ? row.destinations : [],
    initialMeetingDate: row.initial_meeting_date,
    packagePurchased:
      row.package_purchased?.trim() && row.package_purchased !== "0"
        ? row.package_purchased
        : "-",
    deadlineRiskLevel: row.deadline_risk_level,
    deadlineRiskLabel: row.deadline_risk_label?.trim() || "—",
    latestUpdatedAt: row.latest_updated_at,
  }));

  const statusCounts: Record<AdvisorStudentStatusFilter, number> = {
    ...EMPTY_STATUS_COUNTS,
    all: allRows.length,
  };
  for (const row of allRows) {
    statusCounts[row.managementStatus] += 1;
  }

  let filtered = allRows;
  if (options.status !== "all") {
    filtered = filtered.filter(
      (row) => row.managementStatus === options.status,
    );
  }

  const search = options.search.trim().toLowerCase();
  if (search) {
    filtered = filtered.filter((row) => {
      const haystack = [row.studentName, row.studentEmail, row.schoolName]
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }

  const totalRows = filtered.length;
  const page = Math.max(1, options.page);
  const limit = Math.max(1, options.limit);
  const from = (page - 1) * limit;

  return {
    rows: filtered.slice(from, from + limit),
    totalRows,
    page,
    limit,
    search: options.search,
    status: options.status,
    statusCounts,
    studentApplicationOptions,
  };
}
