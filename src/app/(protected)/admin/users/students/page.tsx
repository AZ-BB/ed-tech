import { AdminUsersTableLoader } from "../_components/admin-users-table-loader";

export default function AdminUsersStudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AdminUsersTableLoader tabId="students" searchParams={searchParams} />;
}
