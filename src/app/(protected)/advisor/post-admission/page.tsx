import { redirect } from "next/navigation";

import { fetchAdvisorPostAdmissionList } from "./_lib/fetch-advisor-post-admission-list";
import { parseAdminPostAdmissionSearchParams } from "@/app/(protected)/admin/post-admission/_lib/parse-admin-post-admission-search-params";
import { AdminPostAdmissionTableClient } from "@/app/(protected)/admin/post-admission/_components/admin-post-admission-table-client";

export default async function AdvisorPostAdmissionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseAdminPostAdmissionSearchParams(sp);
  const result = await fetchAdvisorPostAdmissionList(filters);

  if (!result) {
    redirect("/login");
  }

  const { rows, totalRows } = result;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6">
      <AdminPostAdmissionTableClient
        rows={rows}
        totalRows={totalRows}
        page={filters.page}
        limit={filters.limit}
        q={filters.q}
        status={filters.status}
        detailHrefPrefix="/advisor/post-admission"
      />
    </div>
  );
}
