import { notFound } from "next/navigation";

import { createSupabaseSecretClient } from "@/utils/supabase-server";

import { AdminAdvisorViewClient } from "./_components/admin-advisor-view-client";
import { fetchAdminAdvisorDetail } from "./_lib/fetch-admin-advisor-detail";
import {
  fetchAdvisorApplicationsPanel,
  parseAdvisorApplicationStatusFilter,
} from "./_lib/fetch-advisor-applications-page";
import { fetchAdminAdvisorPayoutsPanel } from "./_lib/fetch-advisor-payouts-page";
import {
  fetchAdvisorSessionsPanel,
  parseAdvisorSessionStatusFilter,
} from "./_lib/fetch-advisor-sessions-page";

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function parseInitialTab(
  tabParam: string,
): "overview" | "sessions" | "applications" | "payouts" {
  if (tabParam === "sessions") return "sessions";
  if (tabParam === "applications") return "applications";
  if (tabParam === "payouts") return "payouts";
  return "overview";
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminAdvisorDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  const payload = await fetchAdminAdvisorDetail(id);
  if (!payload) {
    notFound();
  }

  const sessionsPage = Math.max(1, parseIntParam(sp.sessionsPage, 1));
  const sessionsLimit = Math.min(
    50,
    Math.max(5, parseIntParam(sp.sessionsLimit, 10)),
  );
  const sessionStatus = parseAdvisorSessionStatusFilter(sp.sessionStatus);

  const applicationsPage = Math.max(1, parseIntParam(sp.applicationsPage, 1));
  const applicationsLimit = Math.min(
    50,
    Math.max(5, parseIntParam(sp.applicationsLimit, 10)),
  );
  const applicationStatus = parseAdvisorApplicationStatusFilter(
    sp.applicationStatus,
  );
  const payoutsPage = Math.max(1, parseIntParam(sp.payoutsPage, 1));

  const secret = await createSupabaseSecretClient();
  const [sessionsPanel, applicationsPanel, payoutsPanel] = await Promise.all([
    fetchAdvisorSessionsPanel(id, sessionStatus, {
      page: sessionsPage,
      limit: sessionsLimit,
      client: secret,
    }),
    fetchAdvisorApplicationsPanel(id, applicationStatus, {
      page: applicationsPage,
      limit: applicationsLimit,
      client: secret,
    }),
    fetchAdminAdvisorPayoutsPanel(id, { page: payoutsPage }),
  ]);

  if (!payoutsPanel) {
    notFound();
  }

  const tabParam = typeof sp.tab === "string" ? sp.tab : "";
  const initialTab = parseInitialTab(tabParam);

  return (
    <AdminAdvisorViewClient
      advisor={payload.advisor}
      sessionsPanel={sessionsPanel}
      applicationsPanel={applicationsPanel}
      payoutsPanel={payoutsPanel}
      initialTab={initialTab}
    />
  );
}
