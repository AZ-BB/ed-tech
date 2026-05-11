import { SchoolDashboard } from "./_components/school-dashboard";
import { fetchSchoolDashboard } from "./_lib/fetch-school-dashboard";

export default async function SchoolPage() {
  const data = await fetchSchoolDashboard();
  return <SchoolDashboard data={data} />;
}
