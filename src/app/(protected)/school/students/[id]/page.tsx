import { notFound } from "next/navigation";

import { SchoolStudentViewClient } from "./_components/school-student-view-client";
import { fetchSchoolStudentDetail } from "./_lib/fetch-school-student-detail";
import { fetchStudentActivityLogsPanel } from "./_lib/fetch-student-activity-logs-page";
import { fetchStudentUsageHistoryPanel } from "./_lib/fetch-student-usage-history-page";
import { fetchSchoolTasksPage } from "../../tasks/_lib/fetch-school-tasks-page";
import { parseStudentDetailInitialTab } from "@/lib/student-activity-logs";
import { parseStudentUsageHistoryKind } from "@/lib/student-usage-history";
import { createSupabaseServerClient } from "@/utils/supabase-server";

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SchoolStudentDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  const payload = await fetchSchoolStudentDetail(id);

  if (!payload) {
    notFound();
  }

  const page = Math.max(1, parseIntParam(sp.page, 1));
  const limit = Math.min(50, Math.max(5, parseIntParam(sp.limit, 12)));
  const historyPage = Math.max(1, parseIntParam(sp.historyPage, 1));
  const historyLimit = Math.min(
    50,
    Math.max(5, parseIntParam(sp.historyLimit, 10)),
  );
  const historyKind = parseStudentUsageHistoryKind(sp.historyKind);
  const activityLogsPage = Math.max(1, parseIntParam(sp.activityLogsPage, 1));
  const activityLogsLimit = Math.min(
    50,
    Math.max(5, parseIntParam(sp.activityLogsLimit, 10)),
  );

  const supabase = await createSupabaseServerClient();

  const [{ rows, totalRows }, historyPanel, activityLogsPanel] =
    await Promise.all([
      fetchSchoolTasksPage({
        q: "",
        studentQ: "",
        when: "",
        priority: "",
        status: "",
        page,
        limit,
        studentId: id,
      }),
      fetchStudentUsageHistoryPanel(id, historyKind, {
        page: historyPage,
        limit: historyLimit,
        client: supabase,
      }),
      fetchStudentActivityLogsPanel(id, {
        page: activityLogsPage,
        limit: activityLogsLimit,
        client: supabase,
      }),
    ]);

  const tabParam = typeof sp.tab === "string" ? sp.tab : "";
  const initialTab = parseStudentDetailInitialTab(tabParam);

  return (
    <SchoolStudentViewClient
      student={payload.student}
      applicationProfile={payload.applicationProfile}
      quickStats={payload.quickStats}
      platformActivity={payload.platformActivity}
      shortlist={payload.shortlist}
      countries={payload.countries}
      studentNotes={payload.studentNotes}
      studentInteractions={payload.studentInteractions}
      documents={payload.documents}
      essays={payload.essays}
      initialTab={initialTab}
      historyPanel={historyPanel}
      activityLogsPanel={activityLogsPanel}
      tasksPanel={{
        rows,
        totalRows,
        page,
        limit,
        q: "",
        when: "",
        priority: "",
        status: "",
      }}
    />
  );
}
