import { notFound } from "next/navigation";

import { SchoolStudentViewClient } from "./_components/school-student-view-client";
import { fetchSchoolStudentDetail } from "./_lib/fetch-school-student-detail";

type PageProps = { params: Promise<{ id: string }> };

export default async function SchoolStudentDetailPage({ params }: PageProps) {
  const { id } = await params;

  const payload = await fetchSchoolStudentDetail(id);

  if (!payload) {
    notFound();
  }

  return (
    <SchoolStudentViewClient
      student={payload.student}
      applicationProfile={payload.applicationProfile}
      quickStats={payload.quickStats}
      platformActivity={payload.platformActivity}
      shortlist={payload.shortlist}
      countries={payload.countries}
      studentNotes={payload.studentNotes}
    />
  );
}
