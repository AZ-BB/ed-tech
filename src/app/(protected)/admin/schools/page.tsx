import { AdminSchoolsTableLoader } from "./_components/admin-schools-table-loader";

export default function AdminSchoolsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AdminSchoolsTableLoader searchParams={searchParams} />;
}
