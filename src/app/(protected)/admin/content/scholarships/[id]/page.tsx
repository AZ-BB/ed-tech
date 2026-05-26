import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { fetchAdminScholarshipDetail } from "./_lib/fetch-admin-scholarship-detail";
import { fetchAdminScholarshipStudentsPage } from "./_lib/fetch-admin-scholarship-students-page";
import { parseAdminScholarshipDetailSearchParams } from "./_lib/parse-admin-scholarship-detail-search-params";
import { AdminScholarshipOverviewTab } from "./_components/admin-scholarship-overview-tab";
import { AdminScholarshipStudentsTab } from "./_components/admin-scholarship-students-tab";
import { AdminScholarshipViewClient } from "./_components/admin-scholarship-view-client";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { id } = await props.params;
  const payload = await fetchAdminScholarshipDetail(id);
  const name = payload?.scholarship.name;
  return { title: name ? `${name} · Admin` : "Scholarship · Admin" };
}

export default async function AdminScholarshipDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const detailParams = parseAdminScholarshipDetailSearchParams(sp);

  const payload = await fetchAdminScholarshipDetail(id);
  if (!payload) {
    notFound();
  }

  let tabContent;

  switch (detailParams.tab) {
    case "saved": {
      const panel = await fetchAdminScholarshipStudentsPage(
        id,
        "save",
        detailParams.studentsPage,
        detailParams.studentsLimit,
      );
      tabContent = (
        <AdminScholarshipStudentsTab
          title="Saved students"
          emptyMessage="No students have saved this scholarship yet."
          rows={panel.rows}
          totalRows={panel.totalRows}
          page={detailParams.studentsPage}
          limit={detailParams.studentsLimit}
          activityColumnLabel="Saved"
        />
      );
      break;
    }
    case "shortlisted": {
      const panel = await fetchAdminScholarshipStudentsPage(
        id,
        "shortlist",
        detailParams.studentsPage,
        detailParams.studentsLimit,
      );
      tabContent = (
        <AdminScholarshipStudentsTab
          title="Shortlisted students"
          emptyMessage="No students have shortlisted this scholarship yet."
          rows={panel.rows}
          totalRows={panel.totalRows}
          page={detailParams.studentsPage}
          limit={detailParams.studentsLimit}
          activityColumnLabel="Shortlisted"
        />
      );
      break;
    }
    default:
      tabContent = <AdminScholarshipOverviewTab payload={payload} />;
  }

  return (
    <AdminScholarshipViewClient
      scholarship={payload.scholarship}
      tabCounts={payload.tabCounts}
      initialTab={detailParams.tab}
    >
      {tabContent}
    </AdminScholarshipViewClient>
  );
}
