import { buildFullDestinationSelectItems } from "@/lib/school-portal-destination-options";
import { createSupabaseServerClient } from "@/utils/supabase-server";

import { SchoolApplicationsClient } from "./_components/school-applications-client";
import { fetchSchoolApplicationsPage } from "./_lib/fetch-school-applications-page";

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export default async function SchoolApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const country = typeof sp.country === "string" ? sp.country : "";
  const page = Math.max(1, parseIntParam(sp.page, 1));
  const limit = Math.min(50, Math.max(5, parseIntParam(sp.limit, 12)));

  const supabase = await createSupabaseServerClient();
  const { data: countries } = await supabase
    .from("countries")
    .select("name")
    .order("name", { ascending: true });

  const destinationItems = buildFullDestinationSelectItems(countries ?? []);

  const { rows, totalRows } = await fetchSchoolApplicationsPage({
    q,
    deadline: "",
    status,
    country,
    page,
    limit,
  });

  return (
    <SchoolApplicationsClient
      rows={rows}
      totalRows={totalRows}
      page={page}
      limit={limit}
      q={q}
      status={status}
      country={country}
      destinationItems={destinationItems}
    />
  );
}
