import { notFound } from "next/navigation";

import { createSupabaseSecretClient } from "@/utils/supabase-server";

import { AdminSchoolLogsTab } from "./_components/admin-school-logs-tab";
import { AdminSchoolOverviewTab } from "./_components/admin-school-overview-tab";
import { AdminSchoolSessionsTab } from "./_components/admin-school-sessions-tab";
import { AdminSchoolStudentsTab } from "./_components/admin-school-students-tab";
import { AdminSchoolTeachersTab } from "./_components/admin-school-teachers-tab";
import { AdminSchoolViewClient } from "./_components/admin-school-view-client";
import { fetchSchoolActivityLogsPanel } from "./_lib/fetch-admin-school-activity-logs-page";
import { fetchSchoolAmbassadorSessionsPanel } from "./_lib/fetch-admin-school-ambassador-sessions-page";
import { fetchSchoolAdvisorSessionsPanel } from "./_lib/fetch-admin-school-advisor-sessions-page";
import { fetchAdminSchoolDetail } from "./_lib/fetch-admin-school-detail";
import { parseAdminSchoolDetailSearchParams } from "./_lib/parse-admin-school-detail-search-params";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminSchoolDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const detailParams = parseAdminSchoolDetailSearchParams(sp);

  const payload = await fetchAdminSchoolDetail(id);
  if (!payload) {
    notFound();
  }

  const secret = await createSupabaseSecretClient();
  const sessionOptions = {
    page: detailParams.sessionsPage,
    limit: detailParams.sessionsLimit,
    client: secret,
  };

  let tabContent;

  switch (detailParams.tab) {
    case "students":
      tabContent = (
        <AdminSchoolStudentsTab
          schoolId={id}
          schoolName={payload.school.name}
          searchParams={searchParams}
        />
      );
      break;
    case "teachers":
      tabContent = (
        <AdminSchoolTeachersTab
          schoolId={id}
          schoolName={payload.school.name}
          searchParams={searchParams}
        />
      );
      break;
    case "sessions": {
      const [advisorPanel, ambassadorPanel] = await Promise.all([
        fetchSchoolAdvisorSessionsPanel(
          id,
          detailParams.sessionKind === "advisor" ? detailParams.advisorSessionStatus : "all",
          sessionOptions,
        ),
        fetchSchoolAmbassadorSessionsPanel(
          id,
          detailParams.sessionKind === "ambassador"
            ? detailParams.ambassadorSessionStatus
            : "all",
          sessionOptions,
        ),
      ]);

      tabContent = (
        <AdminSchoolSessionsTab
          sessionKind={detailParams.sessionKind}
          advisorPanel={advisorPanel}
          ambassadorPanel={ambassadorPanel}
        />
      );
      break;
    }
    case "logs": {
      const logsPanel = await fetchSchoolActivityLogsPanel(id, {
        page: detailParams.activityLogsPage,
        limit: detailParams.activityLogsLimit,
        client: secret,
      });
      tabContent = <AdminSchoolLogsTab {...logsPanel} />;
      break;
    }
    default:
      tabContent = <AdminSchoolOverviewTab payload={payload} />;
  }

  return (
    <AdminSchoolViewClient
      school={payload.school}
      tabCounts={payload.tabCounts}
      initialTab={detailParams.tab}
    >
      {tabContent}
    </AdminSchoolViewClient>
  );
}
