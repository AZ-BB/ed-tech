import { AdminSessionsTableLoader } from "./_components/admin-sessions-table-loader";

export default function AdminSessionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AdminSessionsTableLoader tabId="advisor" searchParams={searchParams} />;
}
