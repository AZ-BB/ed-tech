import {
  parseSchoolPortalView,
  resolveTeacherFilterFromView,
} from "@/lib/school-portal-view";
import { createSupabaseServerClient } from "@/utils/supabase-server";

import { SchoolReportsClient } from "./_components/school-reports-client";
import { fetchSchoolReports } from "./_lib/fetch-school-reports";

export default async function SchoolReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const view = parseSchoolPortalView(sp.view);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const teacherFilter = resolveTeacherFilterFromView(view, user?.id);

  const data = await fetchSchoolReports({ teacherFilter });

  if (!data) {
    return (
      <div
        style={{
          padding: "24px",
          fontFamily: "'DM Sans',sans-serif",
          fontSize: "14px",
        }}
      >
        Sign in as a school admin to view reports.
      </div>
    );
  }

  return <SchoolReportsClient data={data} />;
}
