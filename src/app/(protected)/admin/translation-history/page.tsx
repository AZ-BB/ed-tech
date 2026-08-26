import { AdminTranslationHistoryTableLoader } from "./_components/admin-translation-history-table-loader";

export default function AdminTranslationHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AdminTranslationHistoryTableLoader searchParams={searchParams} />;
}
