import { AdminUsersTableLoader } from "../_components/admin-users-table-loader";

export default function AdminUsersTeachersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AdminUsersTableLoader tabId="teachers" searchParams={searchParams} />;
}
