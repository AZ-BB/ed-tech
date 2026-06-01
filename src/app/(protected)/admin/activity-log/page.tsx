import { AdminActivityLogTableLoader } from "./_components/admin-activity-log-table-loader";

export default function AdminActivityLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AdminActivityLogTableLoader searchParams={searchParams} />;
}
