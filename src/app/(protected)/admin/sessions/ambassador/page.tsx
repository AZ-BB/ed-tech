import { AdminSessionsTableLoader } from "../_components/admin-sessions-table-loader";

export default function AdminSessionsAmbassadorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <AdminSessionsTableLoader tabId="ambassador" searchParams={searchParams} />
  );
}
