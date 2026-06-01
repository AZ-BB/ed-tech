import { AdminDashboard } from "./_components/admin-dashboard";
import { fetchAdminDashboard } from "./_lib/fetch-admin-dashboard";

export default async function AdminHomePage() {
  const data = await fetchAdminDashboard();
  return <AdminDashboard data={data} />;
}
