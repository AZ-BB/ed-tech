import { AdminContactSubmissionsTableLoader } from "./_components/admin-contact-submissions-table-loader";

export default function AdminContactUsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AdminContactSubmissionsTableLoader searchParams={searchParams} />;
}
