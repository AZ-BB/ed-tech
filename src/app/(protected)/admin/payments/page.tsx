import { AdminPaymentsTableLoader } from "./_components/admin-payments-table-loader";

export default function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AdminPaymentsTableLoader searchParams={searchParams} />;
}
