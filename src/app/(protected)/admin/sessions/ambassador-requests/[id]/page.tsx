import { notFound } from "next/navigation";

import { parseAdminAmbassadorSpecificRequestId } from "../../_data/sessions-tabs-data";
import { AdminAmbassadorSpecificRequestViewClient } from "./_components/admin-ambassador-specific-request-view-client";
import { fetchAdminAmbassadorSpecificRequestDetail } from "./_lib/fetch-admin-ambassador-specific-request-detail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminAmbassadorSpecificRequestDetailPage({
  params,
}: PageProps) {
  const { id: idRaw } = await params;
  const id = parseAdminAmbassadorSpecificRequestId(idRaw);
  if (id == null) {
    notFound();
  }

  const payload = await fetchAdminAmbassadorSpecificRequestDetail(id);
  if (!payload) {
    notFound();
  }

  return <AdminAmbassadorSpecificRequestViewClient payload={payload} />;
}
