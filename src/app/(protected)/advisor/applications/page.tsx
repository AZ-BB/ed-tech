import { redirect } from "next/navigation";

import { AdvisorApplicationsViewClient } from "./_components/advisor-applications-view-client";
import {
  fetchAdvisorPortalApplicationsPanel,
  parseAdvisorApplicationStatusFilter,
} from "./_lib/fetch-advisor-portal-applications-page";
import { fetchAdvisorPortalUniversityTargetsPanel } from "./_lib/fetch-advisor-portal-university-targets-page";
import {
  parseAdvisorApplicationsView,
  parseIntParam,
} from "./_lib/parse-advisor-applications-view";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdvisorApplicationsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const view = parseAdvisorApplicationsView(sp.view);

  if (view === "universities") {
    const universitiesPage = Math.max(1, parseIntParam(sp.universitiesPage, 1));
    const universitiesLimit = Math.min(
      50,
      Math.max(5, parseIntParam(sp.universitiesLimit, 10)),
    );

    const universitiesPanel = await fetchAdvisorPortalUniversityTargetsPanel({
      page: universitiesPage,
      limit: universitiesLimit,
    });

    if (!universitiesPanel) {
      redirect("/login");
    }

    return (
      <AdvisorApplicationsViewClient
        view="universities"
        universitiesPanel={universitiesPanel}
      />
    );
  }

  const applicationsPage = Math.max(1, parseIntParam(sp.applicationsPage, 1));
  const applicationsLimit = Math.min(
    50,
    Math.max(5, parseIntParam(sp.applicationsLimit, 10)),
  );
  const applicationStatus = parseAdvisorApplicationStatusFilter(sp.applicationStatus);
  const search = typeof sp.search === "string" ? sp.search.trim() : "";

  const applicationsPanel = await fetchAdvisorPortalApplicationsPanel(applicationStatus, {
    page: applicationsPage,
    limit: applicationsLimit,
    search,
  });

  if (!applicationsPanel) {
    redirect("/login");
  }

  return (
    <AdvisorApplicationsViewClient
      view="applications"
      applicationsPanel={applicationsPanel}
    />
  );
}
