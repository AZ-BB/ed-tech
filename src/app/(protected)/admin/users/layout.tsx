import { UsersTabsNav } from "./_components/users-tabs-nav";
import { fetchUsersTabCounts } from "./_lib/fetch-users-tab-counts";

export default async function AdminUsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const counts = await fetchUsersTabCounts();

  return (
    <div className="">
      <UsersTabsNav counts={counts} />
      {children}
    </div>
  );
}
