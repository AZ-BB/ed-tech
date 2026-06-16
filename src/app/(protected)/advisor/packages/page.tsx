import { redirect } from "next/navigation";

import { AdvisorActivePackagesTable } from "./_components/advisor-active-packages-table";
import {
  fetchAdvisorActivePackagesPanel,
  parseAdvisorActivePackagesSearch,
} from "./_lib/fetch-advisor-active-packages-page";

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdvisorActivePackagesPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const packagesPage = Math.max(1, parseIntParam(sp.packagesPage, 1));
  const packagesLimit = Math.min(
    50,
    Math.max(5, parseIntParam(sp.packagesLimit, 10)),
  );
  const search = parseAdvisorActivePackagesSearch(sp.search);

  const panel = await fetchAdvisorActivePackagesPanel({
    page: packagesPage,
    limit: packagesLimit,
    search,
  });

  if (!panel) {
    redirect("/login");
  }

  return <AdvisorActivePackagesTable {...panel} />;
}
