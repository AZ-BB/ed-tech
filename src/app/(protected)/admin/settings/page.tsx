import { fetchAdminSettingsPage } from "./_lib/fetch-admin-settings-page";
import { AdminSettingsClient } from "./_components/admin-settings-client";

export default async function AdminSettingsPage() {
  const data = await fetchAdminSettingsPage();

  return (
    <AdminSettingsClient
      settings={data.settings}
      plans={data.plans}
      admins={data.admins}
      rolePermissions={data.rolePermissions}
    />
  );
}
