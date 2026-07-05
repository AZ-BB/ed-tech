import { notFound } from "next/navigation";

import { fetchAdvisorSessionDetail } from "./_lib/fetch-advisor-session-detail";
import { AdvisorSessionViewClient } from "./_components/advisor-session-view-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdvisorSessionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const payload = await fetchAdvisorSessionDetail(id);

  if (!payload) {
    notFound();
  }

  return <AdvisorSessionViewClient payload={payload} />;
}
