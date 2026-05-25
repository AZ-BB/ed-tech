import { notFound } from "next/navigation";

import { fetchTeacherActivityLogsPanel } from "@/app/(protected)/school/students/[id]/_lib/fetch-student-activity-logs-page";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import { AdminTeacherViewClient } from "./_components/admin-teacher-view-client";
import { fetchAdminTeacherDetail } from "./_lib/fetch-admin-teacher-detail";

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function parseInitialTab(tabParam: string): "overview" | "activity_logs" {
  if (tabParam === "activity_logs") return "activity_logs";
  return "overview";
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminTeacherDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  const payload = await fetchAdminTeacherDetail(id);
  if (!payload) {
    notFound();
  }

  const activityLogsPage = Math.max(1, parseIntParam(sp.activityLogsPage, 1));
  const activityLogsLimit = Math.min(
    50,
    Math.max(5, parseIntParam(sp.activityLogsLimit, 10)),
  );

  const secret = await createSupabaseSecretClient();
  const activityLogsPanel = await fetchTeacherActivityLogsPanel(id, {
    page: activityLogsPage,
    limit: activityLogsLimit,
    client: secret,
  });

  const tabParam = typeof sp.tab === "string" ? sp.tab : "";
  const initialTab = parseInitialTab(tabParam);

  return (
    <AdminTeacherViewClient
      teacher={payload.teacher}
      activityLogsPanel={activityLogsPanel}
      initialTab={initialTab}
    />
  );
}
