import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/utils/supabase-server";
import { fetchPostAdmissionActivityLogsPanel } from "@/app/(protected)/admin/post-admission/[id]/_lib/fetch-post-admission-activity-logs-page";
import { parsePostAdmissionDetailTab } from "@/app/(protected)/admin/post-admission/[id]/_lib/parse-post-admission-detail-search-params";

import { AdvisorPostAdmissionViewClient } from "./_components/advisor-post-admission-view-client";
import { fetchAdvisorPostAdmissionDetail } from "./_lib/fetch-advisor-post-admission-detail";

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

export default async function AdvisorPostAdmissionDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  const payload = await fetchAdvisorPostAdmissionDetail(id);
  if (!payload) {
    notFound();
  }

  const activityLogsPage = Math.max(1, parseIntParam(sp.activityLogsPage, 1));
  const activityLogsLimit = Math.min(
    50,
    Math.max(5, parseIntParam(sp.activityLogsLimit, 10)),
  );
  const initialTab = parsePostAdmissionDetailTab(sp.tab);

  const supabase = await createSupabaseServerClient();
  const activityLogsPanel = await fetchPostAdmissionActivityLogsPanel(
    payload.case.id,
    {
      page: activityLogsPage,
      limit: activityLogsLimit,
      client: supabase,
    },
  );

  return (
    <AdvisorPostAdmissionViewClient
      payload={payload}
      activityLogsPanel={activityLogsPanel}
      initialTab={initialTab}
    />
  );
}
