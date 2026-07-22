import { redirect } from "next/navigation";

import { AdvisorSessionsAndCallsTable } from "./_components/advisor-sessions-and-calls-table";
import {
  fetchAdvisorSessionsAndCallsPanel,
  parseAdvisorSessionsAndCallsOutcome,
  parseAdvisorSessionsAndCallsSearch,
  parseAdvisorSessionsAndCallsStatus,
  parseAdvisorSessionsAndCallsType,
} from "./_lib/fetch-advisor-sessions-and-calls-page";

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdvisorSessionsAndCallsPage({
  searchParams,
}: PageProps) {
  const sp = await searchParams;

  const sessionsPage = Math.max(1, parseIntParam(sp.sessionsPage, 1));
  const sessionsLimit = Math.min(
    50,
    Math.max(5, parseIntParam(sp.sessionsLimit, 10)),
  );
  const search = parseAdvisorSessionsAndCallsSearch(sp.search);
  const type = parseAdvisorSessionsAndCallsType(sp.sessionsType);
  const status = parseAdvisorSessionsAndCallsStatus(sp.sessionsStatus);
  const outcome = parseAdvisorSessionsAndCallsOutcome(sp.sessionsOutcome);

  const panel = await fetchAdvisorSessionsAndCallsPanel({
    page: sessionsPage,
    limit: sessionsLimit,
    search,
    type,
    status,
    outcome,
  });

  if (!panel) {
    redirect("/login");
  }

  return <AdvisorSessionsAndCallsTable {...panel} />;
}
