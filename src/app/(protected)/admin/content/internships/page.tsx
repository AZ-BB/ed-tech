import { AdminInternshipsTableLoader } from "../_components/admin-internships-table-loader";

export default function AdminContentInternshipsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AdminInternshipsTableLoader searchParams={searchParams} />;
}
