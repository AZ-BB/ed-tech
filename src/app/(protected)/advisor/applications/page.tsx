import { redirect } from "next/navigation";

import {
  fetchAdvisorPortalApplicationsPanel,
  parseAdvisorApplicationStatusFilter,
} from "./_lib/fetch-advisor-portal-applications-page";
import { AdvisorApplicationsTable } from "./_components/advisor-applications-table";

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdvisorApplicationsPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const applicationsPage = Math.max(1, parseIntParam(sp.applicationsPage, 1));
  const applicationsLimit = Math.min(
    50,
    Math.max(5, parseIntParam(sp.applicationsLimit, 10)),
  );
  const applicationStatus = parseAdvisorApplicationStatusFilter(sp.applicationStatus);

  const panel = await fetchAdvisorPortalApplicationsPanel(applicationStatus, {
    page: applicationsPage,
    limit: applicationsLimit,
  });

  if (!panel) {
    redirect("/login");
  }

  return <AdvisorApplicationsTable {...panel} />;
}
