import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { fetchAdminUniversityDetail } from "./_lib/fetch-admin-university-detail";
import { fetchAdminUniversityStudentsPage } from "./_lib/fetch-admin-university-students-page";
import { parseAdminUniversityDetailSearchParams } from "./_lib/parse-admin-university-detail-search-params";
import { AdminUniversityOverviewTab } from "./_components/admin-university-overview-tab";
import { AdminUniversityStudentsTab } from "./_components/admin-university-students-tab";
import { AdminUniversityViewClient } from "./_components/admin-university-view-client";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { id } = await props.params;
  const payload = await fetchAdminUniversityDetail(id);
  const name = payload?.university.name;
  return { title: name ? `${name} · Admin` : "University · Admin" };
}

export default async function AdminUniversityDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const detailParams = parseAdminUniversityDetailSearchParams(sp);

  const payload = await fetchAdminUniversityDetail(id);
  if (!payload) {
    notFound();
  }

  let tabContent;

  switch (detailParams.tab) {
    case "shortlisted": {
      const panel = await fetchAdminUniversityStudentsPage(
        id,
        "shortlist",
        detailParams.studentsPage,
        detailParams.studentsLimit,
      );
      tabContent = (
        <AdminUniversityStudentsTab
          title="Shortlisted students"
          emptyMessage="No students have shortlisted this university yet."
          rows={panel.rows}
          totalRows={panel.totalRows}
          page={detailParams.studentsPage}
          limit={detailParams.studentsLimit}
          activityColumnLabel="Shortlisted"
        />
      );
      break;
    }
    case "favorites": {
      const panel = await fetchAdminUniversityStudentsPage(
        id,
        "save",
        detailParams.studentsPage,
        detailParams.studentsLimit,
      );
      tabContent = (
        <AdminUniversityStudentsTab
          title="Favorite students"
          emptyMessage="No students have favorited this university yet."
          rows={panel.rows}
          totalRows={panel.totalRows}
          page={detailParams.studentsPage}
          limit={detailParams.studentsLimit}
          activityColumnLabel="Favorited"
        />
      );
      break;
    }
    default:
      tabContent = <AdminUniversityOverviewTab payload={payload} />;
  }

  return (
    <AdminUniversityViewClient
      university={payload.university}
      tabCounts={payload.tabCounts}
      initialTab={detailParams.tab}
    >
      {tabContent}
    </AdminUniversityViewClient>
  );
}
