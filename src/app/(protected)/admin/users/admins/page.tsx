import { AdminUsersTableLoader } from "../_components/admin-users-table-loader";

export default function AdminUsersAdminsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AdminUsersTableLoader tabId="admins" searchParams={searchParams} />;
}
