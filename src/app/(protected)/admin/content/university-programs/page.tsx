import { AdminUniversityProgramsTableLoader } from "../_components/admin-university-programs-table-loader";

export default function AdminContentUniversityProgramsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AdminUniversityProgramsTableLoader searchParams={searchParams} />;
}
