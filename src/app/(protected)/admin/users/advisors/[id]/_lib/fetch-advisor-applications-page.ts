import {
  ADVISOR_APPLICATION_STATUS_OPTIONS,
  fetchAdvisorApplicationStatusCounts,
  fetchAdvisorAssignedApplicationsPage,
  mapToAdminAdvisorApplicationRow,
  parseAdvisorApplicationStatusFilter,
  type AdminAdvisorApplicationRow,
  type AdvisorApplicationStatusFilter,
} from "@/lib/advisor-assigned-applications/fetch-advisor-assigned-applications";
import { createSupabaseServerClient } from "@/utils/supabase-server";

type DbClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type {
  AdminAdvisorApplicationRow,
  AdvisorApplicationStatusFilter,
};
export {
  ADVISOR_APPLICATION_STATUS_OPTIONS,
  parseAdvisorApplicationStatusFilter,
};

export type AdminAdvisorApplicationsPanelProps = {
  rows: AdminAdvisorApplicationRow[];
  totalRows: number;
  page: number;
  limit: number;
  status: AdvisorApplicationStatusFilter;
  statusCounts: Record<AdvisorApplicationStatusFilter, number>;
  search: string;
};

function emptyStatusCounts(): Record<AdvisorApplicationStatusFilter, number> {
  return {
    all: 0,
    lead: 0,
    not_suitable: 0,
    payment_requested: 0,
    active_package: 0,
  };
}

export async function fetchAdvisorApplicationsPage(
  advisorId: string,
  status: AdvisorApplicationStatusFilter,
  options: { page: number; limit: number; client: DbClient; search?: string },
): Promise<{ rows: AdminAdvisorApplicationRow[]; totalRows: number }> {
  const pageResult = await fetchAdvisorAssignedApplicationsPage(
    advisorId,
    status,
    options,
  );
  const rows = pageResult.rows.map(mapToAdminAdvisorApplicationRow);
  return { rows, totalRows: pageResult.totalRows };
}

export async function fetchAdvisorApplicationsPanel(
  advisorId: string,
  status: AdvisorApplicationStatusFilter,
  options: { page: number; limit: number; client: DbClient; search?: string },
): Promise<AdminAdvisorApplicationsPanelProps> {
  const search = options.search?.trim() ?? "";
  const [pageResult, statusCounts] = await Promise.all([
    fetchAdvisorApplicationsPage(advisorId, status, options),
    fetchAdvisorApplicationStatusCounts(advisorId, options.client, search).catch(
      () => emptyStatusCounts(),
    ),
  ]);

  return {
    ...pageResult,
    page: options.page,
    limit: options.limit,
    status,
    statusCounts,
    search,
  };
}
