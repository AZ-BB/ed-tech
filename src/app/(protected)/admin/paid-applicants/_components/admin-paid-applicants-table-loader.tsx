import { fetchAdminPlanOptions } from "@/app/(protected)/admin/applications/_lib/fetch-admin-plan-options";
import { fetchAdminSchoolOptions } from "@/app/(protected)/admin/users/_lib/fetch-admin-school-options";

import { fetchAdminPaidApplicantsPanel } from "../_lib/fetch-admin-paid-applicants-page";
import { parseAdminPaidApplicantsSearchParams } from "../_lib/parse-admin-paid-applicants-search-params";
import { AdminPaidApplicantsTableClient } from "./admin-paid-applicants-table-client";

export async function AdminPaidApplicantsTableLoader({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseAdminPaidApplicantsSearchParams(sp);

  const [panel, schoolOptions, planOptions] = await Promise.all([
    fetchAdminPaidApplicantsPanel(filters),
    fetchAdminSchoolOptions(),
    fetchAdminPlanOptions(),
  ]);

  return (
    <AdminPaidApplicantsTableClient
      rows={panel.rows}
      totalRows={panel.totalRows}
      page={panel.page}
      limit={panel.limit}
      q={panel.q}
      schoolId={panel.schoolId}
      planId={panel.planId}
      paymentRequestApplications={panel.paymentRequestApplications}
      availablePlans={panel.availablePlans}
      adminName={panel.adminName}
      adminEmail={panel.adminEmail}
      fromEmailDisplay={panel.fromEmailDisplay}
      schoolOptions={schoolOptions}
      planOptions={planOptions}
    />
  );
}
