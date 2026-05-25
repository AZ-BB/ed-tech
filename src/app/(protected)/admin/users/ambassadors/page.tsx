import { AdminUsersTableLoader } from "../_components/admin-users-table-loader";

export default function AdminUsersAmbassadorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <AdminUsersTableLoader tabId="ambassadors" searchParams={searchParams} />
  );
}
