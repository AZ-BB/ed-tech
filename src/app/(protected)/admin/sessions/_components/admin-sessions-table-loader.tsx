import { fetchAdminSchoolOptions } from "@/app/(protected)/admin/users/_lib/fetch-admin-school-options";

import type { SessionsTabId } from "../_data/sessions-tabs-data";
import { fetchAdminSessionsPage } from "../_lib/fetch-admin-sessions-page";
import { parseAdminSessionsSearchParams } from "../_lib/parse-admin-sessions-search-params";
import { AdminSessionsTableClient } from "./admin-sessions-table-client";

export async function AdminSessionsTableLoader({
  tabId,
  searchParams,
}: {
  tabId: SessionsTabId;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseAdminSessionsSearchParams(sp, tabId);

  const [{ rows, totalRows }, schoolOptions] = await Promise.all([
    fetchAdminSessionsPage(tabId, filters),
    fetchAdminSchoolOptions(),
  ]);

  return (
    <AdminSessionsTableClient
      tabId={tabId}
      rows={rows}
      totalRows={totalRows}
      page={filters.page}
      limit={filters.limit}
      q={filters.q}
      status={filters.status}
      kind={filters.kind}
      schoolId={filters.schoolId}
      schoolOptions={schoolOptions}
    />
  );
}
