import { SchoolReportsClient } from "./_components/school-reports-client";
import { fetchSchoolReports } from "./_lib/fetch-school-reports";

export default async function SchoolReportsPage() {
  const data = await fetchSchoolReports();

  if (!data) {
    return (
      <div
        style={{
          padding: "24px",
          fontFamily: "'DM Sans',sans-serif",
          fontSize: "14px",
        }}
      >
        Sign in as a school admin to view reports.
      </div>
    );
  }

  return <SchoolReportsClient data={data} />;
}
