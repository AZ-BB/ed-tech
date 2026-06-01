import { AdminDocumentsTableLoader } from "./_components/admin-documents-table-loader";

export default function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AdminDocumentsTableLoader searchParams={searchParams} />;
}
