import { notFound } from "next/navigation";

import { parseAdminSessionDetailParams } from "../../../_data/sessions-tabs-data";
import { fetchAdminSessionDetail } from "../../../_lib/fetch-admin-session-detail";
import { AdminSessionViewClient } from "./_components/admin-session-view-client";

type PageProps = {
  params: Promise<{ kind: string; id: string }>;
};

export default async function AdminSessionDetailPage({ params }: PageProps) {
  const { kind: kindRaw, id: idRaw } = await params;
  const parsed = parseAdminSessionDetailParams(kindRaw, idRaw);
  if (!parsed) {
    notFound();
  }

  const payload = await fetchAdminSessionDetail(parsed.kind, parsed.id);
  if (!payload) {
    notFound();
  }

  return <AdminSessionViewClient payload={payload} />;
}
