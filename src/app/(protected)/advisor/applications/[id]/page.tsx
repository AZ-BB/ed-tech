import { notFound } from "next/navigation";

import { fetchApplicationActivityLogsPanel } from "@/app/(protected)/admin/applications/[id]/_lib/fetch-application-activity-logs-page";
import { parseAdminApplicationDetailTab } from "@/app/(protected)/admin/applications/[id]/_lib/parse-admin-application-detail-search-params";
import { createSupabaseServerClient } from "@/utils/supabase-server";

import { AdvisorApplicationViewClient } from "./_components/advisor-application-view-client";
import { fetchAdvisorApplicationDetail } from "./_lib/fetch-advisor-application-detail";

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

export default async function AdvisorApplicationDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  const payload = await fetchAdvisorApplicationDetail(id);
  if (!payload) {
    notFound();
  }

  const activityLogsPage = Math.max(1, parseIntParam(sp.activityLogsPage, 1));
  const activityLogsLimit = Math.min(
    50,
    Math.max(5, parseIntParam(sp.activityLogsLimit, 10)),
  );
  const initialTab = parseAdminApplicationDetailTab(sp.tab);

  const supabase = await createSupabaseServerClient();
  const activityLogsPanel = await fetchApplicationActivityLogsPanel(
    payload.application.id,
    {
      page: activityLogsPage,
      limit: activityLogsLimit,
      client: supabase,
      audience: "advisor",
    },
  );

  return (
    <AdvisorApplicationViewClient
      payload={payload}
      activityLogsPanel={activityLogsPanel}
      initialTab={initialTab}
    />
  );
}
