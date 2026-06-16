import { redirect } from "next/navigation";

import { AdvisorNewLeadsTable } from "./_components/advisor-new-leads-table";
import {
  fetchAdvisorNewLeadsPanel,
  parseAdvisorNewLeadsSearch,
} from "./_lib/fetch-advisor-new-leads-page";

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdvisorNewLeadsPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const leadsPage = Math.max(1, parseIntParam(sp.leadsPage, 1));
  const leadsLimit = Math.min(
    50,
    Math.max(5, parseIntParam(sp.leadsLimit, 10)),
  );
  const search = parseAdvisorNewLeadsSearch(sp.search);

  const panel = await fetchAdvisorNewLeadsPanel({
    page: leadsPage,
    limit: leadsLimit,
    search,
  });

  if (!panel) {
    redirect("/login");
  }

  return <AdvisorNewLeadsTable {...panel} />;
}
