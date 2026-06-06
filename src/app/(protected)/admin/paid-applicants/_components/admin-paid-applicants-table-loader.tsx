import { fetchAdminPlanOptions } from "@/app/(protected)/admin/applications/_lib/fetch-admin-plan-options";
import { fetchAdminSchoolOptions } from "@/app/(protected)/admin/users/_lib/fetch-admin-school-options";

import { fetchAdminPaidApplicantsPage } from "../_lib/fetch-admin-paid-applicants-page";
import { parseAdminPaidApplicantsSearchParams } from "../_lib/parse-admin-paid-applicants-search-params";
import { AdminPaidApplicantsTableClient } from "./admin-paid-applicants-table-client";

export async function AdminPaidApplicantsTableLoader({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseAdminPaidApplicantsSearchParams(sp);

  const [{ rows, totalRows }, schoolOptions, planOptions] = await Promise.all([
    fetchAdminPaidApplicantsPage(filters),
    fetchAdminSchoolOptions(),
    fetchAdminPlanOptions(),
  ]);

  return (
    <AdminPaidApplicantsTableClient
      rows={rows}
      totalRows={totalRows}
      page={filters.page}
      limit={filters.limit}
      q={filters.q}
      schoolId={filters.schoolId}
      planId={filters.planId}
      schoolOptions={schoolOptions}
      planOptions={planOptions}
    />
  );
}
