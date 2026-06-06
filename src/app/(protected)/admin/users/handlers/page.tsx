import { AdminHandlersTableClient } from "../_components/admin-handlers-table-client";
import { fetchAdminHandlersPage } from "../_lib/fetch-admin-handlers-page";

export default async function AdminUsersHandlersPage() {
  const rows = await fetchAdminHandlersPage();

  return <AdminHandlersTableClient rows={rows} />;
}
