import { fetchAdminDocumentsPage } from "../_lib/fetch-admin-documents-page";
import { parseAdminDocumentsSearchParams } from "../_lib/parse-admin-documents-search-params";
import { fetchAdminSchoolOptions } from "../../users/_lib/fetch-admin-school-options";
import { AdminDocumentsTableClient } from "./admin-documents-table-client";

export async function AdminDocumentsTableLoader({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseAdminDocumentsSearchParams(sp);

  const [{ rows, totalRows }, schoolOptions] = await Promise.all([
    fetchAdminDocumentsPage(filters),
    fetchAdminSchoolOptions(),
  ]);

  return (
    <AdminDocumentsTableClient
      rows={rows}
      totalRows={totalRows}
      page={filters.page}
      limit={filters.limit}
      q={filters.q}
      studentQ={filters.studentQ}
      status={filters.status}
      schoolId={filters.schoolId}
      schoolOptions={schoolOptions}
    />
  );
}
