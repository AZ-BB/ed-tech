import { AdminScholarshipsTableLoader } from "../_components/admin-scholarships-table-loader";

export default function AdminContentScholarshipsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AdminScholarshipsTableLoader searchParams={searchParams} />;
}
