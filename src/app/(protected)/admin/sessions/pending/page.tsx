import { AdminSessionsTableLoader } from "../_components/admin-sessions-table-loader";

export default function AdminSessionsPendingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AdminSessionsTableLoader tabId="pending" searchParams={searchParams} />;
}
