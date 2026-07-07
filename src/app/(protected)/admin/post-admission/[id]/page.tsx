import { notFound } from "next/navigation";

import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { fetchAdminApplicationAdvisorOptions } from "@/app/(protected)/admin/applications/_lib/fetch-admin-application-advisor-options";

import { AdminPostAdmissionViewClient } from "./_components/admin-post-admission-view-client";
import { fetchAdminPostAdmissionDetail } from "./_lib/fetch-admin-post-admission-detail";
import { fetchPostAdmissionActivityLogsPanel } from "./_lib/fetch-post-admission-activity-logs-page";
import { parsePostAdmissionDetailTab } from "./_lib/parse-post-admission-detail-search-params";

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

export default async function AdminPostAdmissionDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  const payload = await fetchAdminPostAdmissionDetail(id);
  if (!payload) {
    notFound();
  }

  const activityLogsPage = Math.max(1, parseIntParam(sp.activityLogsPage, 1));
  const activityLogsLimit = Math.min(
    50,
    Math.max(5, parseIntParam(sp.activityLogsLimit, 10)),
  );
  const initialTab = parsePostAdmissionDetailTab(sp.tab);

  const secret = await createSupabaseSecretClient();
  const [activityLogsPanel, advisorOptions] = await Promise.all([
    fetchPostAdmissionActivityLogsPanel(payload.case.id, {
      page: activityLogsPage,
      limit: activityLogsLimit,
      client: secret,
    }),
    fetchAdminApplicationAdvisorOptions({
      includeAdvisorId: payload.advisor?.id ?? null,
    }),
  ]);

  return (
    <AdminPostAdmissionViewClient
      payload={payload}
      activityLogsPanel={activityLogsPanel}
      advisorOptions={advisorOptions}
      initialTab={initialTab}
    />
  );
}
