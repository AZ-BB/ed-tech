import { redirect } from "next/navigation";

import { AdvisorStudentsTable } from "./_components/advisor-students-table";
import {
  fetchAdvisorStudentsPanel,
  parseAdvisorStudentsSearch,
} from "./_lib/fetch-advisor-students-page";
import { parseAdvisorStudentStatusFilter } from "@/lib/advisor-student-derivations";

function parseIntParam(raw: string | string[] | undefined, fallback: number) {
  const s =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const n = s !== undefined ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdvisorStudentsPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const studentsPage = Math.max(1, parseIntParam(sp.studentsPage, 1));
  const studentsLimit = Math.min(
    50,
    Math.max(5, parseIntParam(sp.studentsLimit, 10)),
  );
  const search = parseAdvisorStudentsSearch(sp.search);
  const status = parseAdvisorStudentStatusFilter(sp.studentStatus);

  const panel = await fetchAdvisorStudentsPanel({
    page: studentsPage,
    limit: studentsLimit,
    search,
    status,
  });

  if (!panel) {
    redirect("/login");
  }

  return <AdvisorStudentsTable {...panel} />;
}
