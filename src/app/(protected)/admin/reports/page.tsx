import { fetchAdminSchoolOptions } from "../users/_lib/fetch-admin-school-options";
import { AdminReportsClient } from "./_components/admin-reports-client";
import { fetchAdminReportsOverview } from "./_lib/fetch-admin-reports-overview";
import {
  defaultReportDateInputs,
  reportDateBoundsFromInputs,
} from "./_lib/report-date-range";

export default async function AdminReportsPage() {
  const { startDate, endDate } = defaultReportDateInputs();
  const bounds = reportDateBoundsFromInputs(startDate, endDate);
  const [schoolOptions, overview] = await Promise.all([
    fetchAdminSchoolOptions(),
    bounds
      ? fetchAdminReportsOverview("", bounds)
      : Promise.resolve({
          totalUsers: 0,
          activeInRange: 0,
          totalShortlists: 0,
          tokensUsed: 0,
        }),
  ]);

  return (
    <AdminReportsClient
      initialOverview={overview}
      schoolOptions={schoolOptions}
      defaultStartDate={startDate}
      defaultEndDate={endDate}
    />
  );
}
