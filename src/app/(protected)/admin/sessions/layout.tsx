import { SessionsTabsNav } from "./_components/sessions-tabs-nav";
import { fetchAdminSessionsTabCounts } from "./_lib/fetch-admin-sessions-tab-counts";

export default async function AdminSessionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const counts = await fetchAdminSessionsTabCounts();

  return (
    <div className="">
      <SessionsTabsNav counts={counts} />
      {children}
    </div>
  );
}
