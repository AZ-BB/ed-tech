import { AdminPaidApplicantsTableLoader } from "./_components/admin-paid-applicants-table-loader";

export default function AdminPaidApplicantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AdminPaidApplicantsTableLoader searchParams={searchParams} />;
}
