import { AdminNewsTableClient } from "../_components/admin-news-table-client";
import { fetchAdminNewsPage } from "../_lib/fetch-admin-news-page";

export default async function AdminContentNewsPage() {
  const rows = await fetchAdminNewsPage();

  return <AdminNewsTableClient rows={rows} />;
}
