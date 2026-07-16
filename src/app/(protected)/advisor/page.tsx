import { fetchAdvisorSessionProfile } from "@/lib/advisor-access";

import { AdvisorDashboard } from "./_components/advisor-dashboard";
import { fetchAdvisorDashboard } from "./_lib/fetch-advisor-dashboard";
import { fetchAdvisorSessionsAndCallsInRange } from "./sessions-and-calls/_lib/fetch-advisor-sessions-and-calls-page";

export default async function AdvisorPage() {
  const now = new Date();
  const calendarYear = now.getFullYear();
  const calendarMonthIndex = now.getMonth();
  const monthStart = new Date(calendarYear, calendarMonthIndex, 1, 0, 0, 0, 0);
  const monthEnd = new Date(calendarYear, calendarMonthIndex + 1, 1, 0, 0, 0, 0);

  const [data, monthSessionsAndCalls, session] = await Promise.all([
    fetchAdvisorDashboard(),
    fetchAdvisorSessionsAndCallsInRange(monthStart, monthEnd),
    fetchAdvisorSessionProfile(),
  ]);

  const firstName =
    session.ok ? (session.advisor.first_name?.trim() ?? "") : "";
  const displayName = session.ok
    ? [session.advisor.first_name, session.advisor.last_name]
        .map((s) => s?.trim())
        .filter(Boolean)
        .join(" ") || "Advisor"
    : "Advisor";
  const title = session.ok ? session.advisor.title?.trim() : undefined;

  return (
    <AdvisorDashboard
      data={data}
      monthSessionsAndCalls={monthSessionsAndCalls}
      calendarYear={calendarYear}
      calendarMonthIndex={calendarMonthIndex}
      welcome={{ firstName, displayName, title }}
    />
  );
}
