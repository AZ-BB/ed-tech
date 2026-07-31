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
  const panel = await fetchAdminPaidApplicantsPanel(filters);

  return <AdminPaidApplicantsTableClient {...panel} />;
}
