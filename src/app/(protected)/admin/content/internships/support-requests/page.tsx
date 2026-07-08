import { AdminInternshipSupportRequestsTableLoader } from "./_components/admin-internship-support-requests-table-loader";

export default function AdminInternshipSupportRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <AdminInternshipSupportRequestsTableLoader searchParams={searchParams} />
  );
}
