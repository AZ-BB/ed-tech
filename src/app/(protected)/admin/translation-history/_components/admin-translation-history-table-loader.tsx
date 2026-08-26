import { fetchAdminTranslationHistoryPage } from "../_lib/fetch-admin-translation-history-page";
import { parseAdminTranslationHistorySearchParams } from "../_lib/parse-admin-translation-history-search-params";
import { AdminTranslationHistoryTableClient } from "./admin-translation-history-table-client";

export async function AdminTranslationHistoryTableLoader({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseAdminTranslationHistorySearchParams(sp);
  const { groups, totalGroups, totalInputTokens, totalOutputTokens } =
    await fetchAdminTranslationHistoryPage(filters);

  return (
    <AdminTranslationHistoryTableClient
      groups={groups}
      totalGroups={totalGroups}
      totalInputTokens={totalInputTokens}
      totalOutputTokens={totalOutputTokens}
      page={filters.page}
      limit={filters.limit}
      q={filters.q}
    />
  );
}
