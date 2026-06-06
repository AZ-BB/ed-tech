import { notFound } from "next/navigation";

import { createSupabaseSecretClient } from "@/utils/supabase-server";

import { AdminApplicationViewClient } from "./_components/admin-application-view-client";
import { fetchAdminApplicationDetail } from "./_lib/fetch-admin-application-detail";
import { fetchApplicationActivityLogsPanel } from "./_lib/fetch-application-activity-logs-page";
import { parseAdminApplicationDetailTab } from "./_lib/parse-admin-application-detail-search-params";
import { fetchAdminHandlerOptions } from "../_lib/fetch-admin-handler-options";

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

export default async function AdminApplicationDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  const payload = await fetchAdminApplicationDetail(id);
  if (!payload) {
    notFound();
  }

  const activityLogsPage = Math.max(1, parseIntParam(sp.activityLogsPage, 1));
  const activityLogsLimit = Math.min(
    50,
    Math.max(5, parseIntParam(sp.activityLogsLimit, 10)),
  );
  const initialTab = parseAdminApplicationDetailTab(sp.tab);

  const secret = await createSupabaseSecretClient();
  const [activityLogsPanel, handlerOptions] = await Promise.all([
    fetchApplicationActivityLogsPanel(payload.application.id, {
      page: activityLogsPage,
      limit: activityLogsLimit,
      client: secret,
    }),
    fetchAdminHandlerOptions({
      includeHandlerId: payload.handler?.id ?? null,
    }),
  ]);

  return (
    <AdminApplicationViewClient
      payload={payload}
      activityLogsPanel={activityLogsPanel}
      handlerOptions={handlerOptions}
      initialTab={initialTab}
    />
  );
}
