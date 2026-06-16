import { redirect } from "next/navigation";

import { AdvisorTasksTable } from "./_components/advisor-tasks-table";
import {
  fetchAdvisorTasksPanel,
  parseAdvisorTaskStatusFilter,
} from "./_lib/fetch-advisor-tasks-page";

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdvisorTasksPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const tasksPage = Math.max(1, parseIntParam(sp.tasksPage, 1));
  const tasksLimit = Math.min(
    50,
    Math.max(5, parseIntParam(sp.tasksLimit, 10)),
  );
  const status = parseAdvisorTaskStatusFilter(sp.status);

  const panel = await fetchAdvisorTasksPanel({
    page: tasksPage,
    limit: tasksLimit,
    status,
  });

  if (!panel) {
    redirect("/login");
  }

  return <AdvisorTasksTable {...panel} />;
}
