import {
  type AdvisorStudentManagementStatus,
  type AdvisorStudentStatusFilter,
} from "@/lib/advisor-student-derivations";
import { resolveCurrentAdvisorId } from "@/lib/advisor-access";
import {
  fetchAdvisorAssignedApplicationsPanel,
  type AdvisorAssignedApplicationRow,
} from "@/lib/advisor-assigned-applications/fetch-advisor-assigned-applications";
import { createSupabaseServerClient } from "@/utils/supabase-server";

export type AdvisorStudentRow = AdvisorAssignedApplicationRow;

export type AdvisorStudentsPanelProps = {
  rows: AdvisorStudentRow[];
  totalRows: number;
  page: number;
  limit: number;
  search: string;
  status: AdvisorStudentStatusFilter;
  statusCounts: Record<AdvisorStudentStatusFilter, number>;
};

const EMPTY_STATUS_COUNTS: Record<AdvisorStudentStatusFilter, number> = {
  all: 0,
  lead: 0,
  not_suitable: 0,
  payment_requested: 0,
  active_package: 0,
};

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

  const emptyPanel: AdvisorStudentsPanelProps = {
    rows: [],
    totalRows: 0,
    page: options.page,
    limit: options.limit,
    search: options.search,
    status: options.status,
    statusCounts: { ...EMPTY_STATUS_COUNTS },
  };

  if (!advisorId) {
    return null;
  }

  const panel = await fetchAdvisorAssignedApplicationsPanel(
    advisorId,
    options.status,
    {
      page: options.page,
      limit: options.limit,
      client: supabase,
      search: options.search,
    },
  );

  const statusCounts: Record<AdvisorStudentStatusFilter, number> = {
    all: panel.statusCounts.all,
    lead: panel.statusCounts.lead,
    not_suitable: panel.statusCounts.not_suitable,
    payment_requested: panel.statusCounts.payment_requested,
    active_package: panel.statusCounts.active_package,
  };

  return {
    rows: panel.rows,
    totalRows: panel.totalRows,
    page: panel.page,
    limit: panel.limit,
    search: panel.search,
    status: options.status,
    statusCounts,
  };
}

export type { AdvisorStudentManagementStatus };
