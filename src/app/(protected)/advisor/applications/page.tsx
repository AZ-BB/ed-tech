import { redirect } from "next/navigation";

import { AdvisorApplicationsViewClient } from "./_components/advisor-applications-view-client";
import { fetchAdvisorPortalUniversityTargetsPanel } from "./_lib/fetch-advisor-portal-university-targets-page";
import { parseIntParam } from "./_lib/parse-advisor-applications-view";
import {
  parseAdvisorUniversityTargetDecisionFilter,
  parseAdvisorUniversityTargetStatusFilter,
} from "./_lib/parse-advisor-university-targets-filters";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdvisorApplicationsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const universitiesPage = Math.max(1, parseIntParam(sp.universitiesPage, 1));
  const universitiesLimit = Math.min(
    50,
    Math.max(5, parseIntParam(sp.universitiesLimit, 10)),
  );

  const universitiesPanel = await fetchAdvisorPortalUniversityTargetsPanel({
    page: universitiesPage,
    limit: universitiesLimit,
    search: typeof sp.search === "string" ? sp.search.trim() : "",
    status: parseAdvisorUniversityTargetStatusFilter(sp.targetStatus),
    decision: parseAdvisorUniversityTargetDecisionFilter(sp.targetDecision),
  });

  if (!universitiesPanel) {
    redirect("/login");
  }

  return <AdvisorApplicationsViewClient universitiesPanel={universitiesPanel} />;
}
