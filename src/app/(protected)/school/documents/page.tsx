import {
  parseSchoolPortalView,
  resolveTeacherFilterFromView,
} from "@/lib/school-portal-view";
import { createSupabaseServerClient } from "@/utils/supabase-server";

import { SchoolDocumentsClient } from "./_components/school-documents-client";
import { fetchSchoolDocumentsPage } from "./_lib/fetch-school-documents";

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export default async function SchoolDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const studentQ = typeof sp.studentQ === "string" ? sp.studentQ : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Math.max(1, parseIntParam(sp.page, 1));
  const limit = Math.min(50, Math.max(5, parseIntParam(sp.limit, 12)));
  const view = parseSchoolPortalView(sp.view);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const teacherFilter = resolveTeacherFilterFromView(view, user?.id);

  const { rows, totalRows } = await fetchSchoolDocumentsPage({
    q,
    studentQ,
    status,
    page,
    limit,
    teacherFilter,
  });

  return (
    <SchoolDocumentsClient
      rows={rows}
      totalRows={totalRows}
      page={page}
      limit={limit}
      q={q}
      studentQ={studentQ}
      status={status}
      view={view}
    />
  );
}
