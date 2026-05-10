import { notFound } from "next/navigation";

import { SchoolStudentViewClient } from "./_components/school-student-view-client";
import { fetchSchoolStudentDetail } from "./_lib/fetch-school-student-detail";
import { fetchSchoolTasksPage } from "../../tasks/_lib/fetch-school-tasks-page";

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SchoolStudentDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  const payload = await fetchSchoolStudentDetail(id);

  if (!payload) {
    notFound();
  }

  const page = Math.max(1, parseIntParam(sp.page, 1));
  const limit = Math.min(50, Math.max(5, parseIntParam(sp.limit, 12)));

  const { rows, totalRows } = await fetchSchoolTasksPage({
    q: "",
    when: "",
    priority: "",
    status: "",
    page,
    limit,
    studentId: id,
  });

  const tabParam = typeof sp.tab === "string" ? sp.tab : "";
  const initialTab = tabParam === "tasks" ? "tasks" : "snapshot";

  return (
    <SchoolStudentViewClient
      student={payload.student}
      applicationProfile={payload.applicationProfile}
      quickStats={payload.quickStats}
      platformActivity={payload.platformActivity}
      shortlist={payload.shortlist}
      countries={payload.countries}
      studentNotes={payload.studentNotes}
      documents={payload.documents}
      initialTab={initialTab}
      tasksPanel={{
        rows,
        totalRows,
        page,
        limit,
        q: "",
        when: "",
        priority: "",
        status: "",
      }}
    />
  );
}
