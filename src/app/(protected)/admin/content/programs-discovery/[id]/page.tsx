import { notFound } from "next/navigation";

import { fetchAdminProgramDiscoveryDetail } from "../../_lib/fetch-admin-programs-discovery-page";
import { AdminProgramViewClient } from "./_components/admin-program-view-client";

export default async function AdminProgramDiscoveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const program = await fetchAdminProgramDiscoveryDetail(id);

  if (!program) {
    notFound();
  }

  return <AdminProgramViewClient program={program} />;
}
