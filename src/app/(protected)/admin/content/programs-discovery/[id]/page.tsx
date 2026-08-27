import { notFound } from "next/navigation";

import { fetchAdminProgramDiscoveryDetailWithTranslation } from "@/actions/admin-program-discovery-translation";
import { AdminProgramViewClient } from "./_components/admin-program-view-client";

export default async function AdminProgramDiscoveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const program = await fetchAdminProgramDiscoveryDetailWithTranslation(id);

  if (!program) {
    notFound();
  }

  return <AdminProgramViewClient program={program} />;
}
