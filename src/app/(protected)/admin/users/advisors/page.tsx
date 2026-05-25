import { AdminUsersTableLoader } from "../_components/admin-users-table-loader";

export default function AdminUsersAdvisorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AdminUsersTableLoader tabId="advisors" searchParams={searchParams} />;
}
