import { notFound } from "next/navigation";

import { AdvisorStudentViewClient } from "./_components/advisor-student-view-client";
import { fetchAdvisorStudentDetail } from "./_lib/fetch-advisor-student-detail";

type PageProps = {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdvisorStudentDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { studentId } = await params;
  const sp = await searchParams;

  const tab = sp.tab === "applications" ? "applications" : "overview";

  const payload = await fetchAdvisorStudentDetail(studentId);

  if (!payload) {
    notFound();
  }

  return <AdvisorStudentViewClient {...payload} initialTab={tab} />;
}
