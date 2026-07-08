import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { fetchAdminInternshipDetail } from "./_lib/fetch-admin-internship-detail";
import { fetchAdminInternshipStudentsPage } from "./_lib/fetch-admin-internship-students-page";
import { parseAdminInternshipDetailSearchParams } from "./_lib/parse-admin-internship-detail-search-params";
import { AdminInternshipOverviewTab } from "./_components/admin-internship-overview-tab";
import { AdminInternshipStudentsTab } from "./_components/admin-internship-students-tab";
import { AdminInternshipViewClient } from "./_components/admin-internship-view-client";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { id } = await props.params;
  const payload = await fetchAdminInternshipDetail(id);
  const name = payload?.internship.name;
  return { title: name ? `${name} · Admin` : "Internship · Admin" };
}

export default async function AdminInternshipDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const detailParams = parseAdminInternshipDetailSearchParams(sp);

  const payload = await fetchAdminInternshipDetail(id);
  if (!payload) {
    notFound();
  }

  let tabContent;

  switch (detailParams.tab) {
    case "saved": {
      const panel = await fetchAdminInternshipStudentsPage(
        id,
        detailParams.studentsPage,
        detailParams.studentsLimit,
      );
      tabContent = (
        <AdminInternshipStudentsTab
          title="Saved students"
          emptyMessage="No students have saved this internship yet."
          rows={panel.rows}
          totalRows={panel.totalRows}
          page={detailParams.studentsPage}
          limit={detailParams.studentsLimit}
          activityColumnLabel="Saved"
        />
      );
      break;
    }
    default:
      tabContent = <AdminInternshipOverviewTab payload={payload} />;
  }

  return (
    <AdminInternshipViewClient
      internship={payload.internship}
      tabCounts={payload.tabCounts}
      initialTab={detailParams.tab}
    >
      {tabContent}
    </AdminInternshipViewClient>
  );
}
