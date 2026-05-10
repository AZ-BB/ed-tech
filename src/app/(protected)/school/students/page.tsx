import { buildFullDestinationSelectItems } from "@/lib/school-portal-destination-options";
import { createSupabaseServerClient } from "@/utils/supabase-server";

import { SchoolStudentsClient } from "./_components/school-students-client";
import { fetchSchoolStudentsPage } from "./_lib/fetch-school-students-page";

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export default async function SchoolStudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const grade = typeof sp.grade === "string" ? sp.grade : "";
  const dest = typeof sp.dest === "string" ? sp.dest : "";
  const page = Math.max(1, parseIntParam(sp.page, 1));
  const limit = Math.min(50, Math.max(5, parseIntParam(sp.limit, 12)));

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let counselorOptions: { id: string; label: string }[] = [];
  if (user?.id) {
    const { data: sap } = await supabase
      .from("school_admin_profiles")
      .select("school_id")
      .eq("id", user.id)
      .maybeSingle();

    if (sap?.school_id) {
      const { data: admins } = await supabase
        .from("school_admin_profiles")
        .select("id, first_name, last_name")
        .eq("school_id", sap.school_id)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true });

      counselorOptions = (admins ?? []).map((a) => {
        const label =
          `${a.first_name?.trim() ?? ""} ${a.last_name?.trim() ?? ""}`.trim();
        return { id: a.id, label: label || a.id };
      });
    }
  }

  const { data: countries } = await supabase
    .from("countries")
    .select("name")
    .order("name", { ascending: true });

  const destinationItems = buildFullDestinationSelectItems(countries ?? []);

  const { rows, totalRows } = await fetchSchoolStudentsPage({
    q,
    grade,
    destination: dest,
    page,
    limit,
  });

  return (
    <SchoolStudentsClient
      rows={rows}
      totalRows={totalRows}
      page={page}
      limit={limit}
      q={q}
      grade={grade}
      dest={dest}
      destinationItems={destinationItems}
      counselorOptions={counselorOptions}
    />
  );
}
