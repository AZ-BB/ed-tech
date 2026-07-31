import { AdminEventsTableLoader } from "../_components/admin-events-table-loader";

export default function AdminContentEventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AdminEventsTableLoader searchParams={searchParams} />;
}
