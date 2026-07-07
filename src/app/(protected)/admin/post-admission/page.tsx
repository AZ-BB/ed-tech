import { fetchAdminPostAdmissionList } from "./_lib/fetch-admin-post-admission-list";
import { parseAdminPostAdmissionSearchParams } from "./_lib/parse-admin-post-admission-search-params";
import { AdminPostAdmissionTableClient } from "./_components/admin-post-admission-table-client";

export default async function AdminPostAdmissionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseAdminPostAdmissionSearchParams(sp);
  const { rows, totalRows } = await fetchAdminPostAdmissionList(filters);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6">
      <div className="mb-5">
        <h1 className="font-[family-name:var(--font-dm-serif)] text-2xl text-[var(--text)]">
          Post-admission support
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-light)]">
          Manage student post-admission support cases
        </p>
      </div>

      <AdminPostAdmissionTableClient
        rows={rows}
        totalRows={totalRows}
        page={filters.page}
        limit={filters.limit}
        q={filters.q}
        status={filters.status}
      />
    </div>
  );
}
