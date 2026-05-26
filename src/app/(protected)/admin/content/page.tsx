import { AdminUniversitiesTableLoader } from "./_components/admin-universities-table-loader";

export default function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AdminUniversitiesTableLoader searchParams={searchParams} />;
}
