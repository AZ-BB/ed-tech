import { AdminProgramsDiscoveryTableLoader } from "../_components/admin-programs-discovery-table-loader";

export default function AdminContentProgramsDiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AdminProgramsDiscoveryTableLoader searchParams={searchParams} />;
}
