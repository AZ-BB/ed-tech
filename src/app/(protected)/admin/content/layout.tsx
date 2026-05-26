import { ContentTabsNav } from "./_components/content-tabs-nav";
import { fetchContentTabCounts } from "./_lib/fetch-content-tab-counts";

export default async function AdminContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const counts = await fetchContentTabCounts();

  return (
    <div className="">
      <ContentTabsNav counts={counts} />
      {children}
    </div>
  );
}
