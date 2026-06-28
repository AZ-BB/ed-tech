import { fetchAdminWebinarsPage } from "../_lib/fetch-admin-webinars-page";
import { AdminWebinarsTableClient } from "../_components/admin-webinars-table-client";

export default async function AdminContentWebinarsPage() {
  const rows = await fetchAdminWebinarsPage();

  return <AdminWebinarsTableClient rows={rows} />;
}
