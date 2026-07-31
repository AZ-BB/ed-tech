import { notFound } from "next/navigation";

import { AdminEventDetailClient } from "../../_components/admin-event-detail-client";
import { fetchAdminEventDetail } from "../../_lib/fetch-admin-event-detail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const event = await fetchAdminEventDetail(id);

  if (!event) {
    notFound();
  }

  return <AdminEventDetailClient event={event} />;
}
