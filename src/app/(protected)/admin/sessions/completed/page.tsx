import { AdminSessionsTableLoader } from "../_components/admin-sessions-table-loader";

export default function AdminSessionsCompletedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <AdminSessionsTableLoader tabId="completed" searchParams={searchParams} />
  );
}
