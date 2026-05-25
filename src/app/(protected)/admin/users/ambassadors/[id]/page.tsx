import { notFound } from "next/navigation";

import { createSupabaseSecretClient } from "@/utils/supabase-server";

import { AdminAmbassadorViewClient } from "./_components/admin-ambassador-view-client";
import { fetchAdminAmbassadorDetail } from "./_lib/fetch-admin-ambassador-detail";
import {
  fetchAmbassadorSessionsPanel,
  parseAmbassadorSessionStatusFilter,
} from "./_lib/fetch-ambassador-sessions-page";

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function parseInitialTab(tabParam: string): "overview" | "sessions" {
  if (tabParam === "sessions") return "sessions";
  return "overview";
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminAmbassadorDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  const payload = await fetchAdminAmbassadorDetail(id);
  if (!payload) {
    notFound();
  }

  const sessionsPage = Math.max(1, parseIntParam(sp.sessionsPage, 1));
  const sessionsLimit = Math.min(
    50,
    Math.max(5, parseIntParam(sp.sessionsLimit, 10)),
  );
  const sessionStatus = parseAmbassadorSessionStatusFilter(sp.sessionStatus);

  const secret = await createSupabaseSecretClient();
  const sessionsPanel = await fetchAmbassadorSessionsPanel(id, sessionStatus, {
    page: sessionsPage,
    limit: sessionsLimit,
    client: secret,
  });

  const tabParam = typeof sp.tab === "string" ? sp.tab : "";
  const initialTab = parseInitialTab(tabParam);

  return (
    <AdminAmbassadorViewClient
      ambassador={payload.ambassador}
      sessionsPanel={sessionsPanel}
      initialTab={initialTab}
    />
  );
}
