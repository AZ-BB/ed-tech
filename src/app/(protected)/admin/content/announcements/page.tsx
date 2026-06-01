import { fetchAdminAnnouncementsPage } from "../_lib/fetch-admin-announcements-page";
import { AdminAnnouncementsTableClient } from "../_components/admin-announcements-table-client";

export default async function AdminContentAnnouncementsPage() {
  const rows = await fetchAdminAnnouncementsPage();

  return <AdminAnnouncementsTableClient rows={rows} />;
}
