import {
  parseSchoolPortalView,
  resolveTeacherFilterFromView,
} from "@/lib/school-portal-view";
import { createSupabaseServerClient } from "@/utils/supabase-server";

import { SchoolDashboard } from "./_components/school-dashboard";
import { fetchSchoolDashboard } from "./_lib/fetch-school-dashboard";

export default async function SchoolPage({
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

  const data = await fetchSchoolDashboard({ teacherFilter });
  return <SchoolDashboard data={data} />;
}
