import { notFound } from "next/navigation";

import { AdminWebinarDetailClient } from "../../_components/admin-webinar-detail-client";
import {
  fetchAdminWebinarDetail,
  fetchAdminWebinarEnrollments,
} from "../../_lib/fetch-admin-webinar-detail";

type AdminWebinarDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminWebinarDetailPage({ params }: AdminWebinarDetailPageProps) {
  const { id: idRaw } = await params;
  const id = Number.parseInt(idRaw, 10);

  if (!Number.isFinite(id) || id <= 0) {
    notFound();
  }

  const [webinar, enrollments] = await Promise.all([
    fetchAdminWebinarDetail(id),
    fetchAdminWebinarEnrollments(id),
  ]);

  if (!webinar) {
    notFound();
  }

  return <AdminWebinarDetailClient webinar={webinar} enrollments={enrollments} />;
}
