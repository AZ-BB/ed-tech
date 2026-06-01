import { AdminApplicationsTableLoader } from "./_components/admin-applications-table-loader";

export default function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AdminApplicationsTableLoader searchParams={searchParams} />;
}
