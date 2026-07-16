"use server";

import { fetchAdvisorSessionsAndCallsInRange } from "@/app/(protected)/advisor/sessions-and-calls/_lib/fetch-advisor-sessions-and-calls-page";
import type { AdvisorSessionsAndCallsRow } from "@/app/(protected)/advisor/sessions-and-calls/_lib/advisor-sessions-and-calls-shared";

function monthBounds(year: number, monthIndex: number): { start: Date; end: Date } {
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0);
  return { start, end };
}

export async function fetchAdvisorDashboardMonthSessionsAndCalls(
  year: number,
  monthIndex: number,
): Promise<AdvisorSessionsAndCallsRow[]> {
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(monthIndex) ||
    monthIndex < 0 ||
    monthIndex > 11 ||
    year < 2000 ||
    year > 2100
  ) {
    return [];
  }

  const { start, end } = monthBounds(Math.trunc(year), Math.trunc(monthIndex));
  return fetchAdvisorSessionsAndCallsInRange(start, end);
}
