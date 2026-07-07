import { fetchAdvisorSessionProfile } from "@/lib/advisor-access";

import { AdvisorDashboard } from "./_components/advisor-dashboard";
import { fetchAdvisorDashboard } from "./_lib/fetch-advisor-dashboard";
import { fetchAdvisorTodaysSessionsAndCalls } from "./sessions-and-calls/_lib/fetch-advisor-sessions-and-calls-page";

export default async function AdvisorPage() {
  const [data, todaysSessionsAndCalls, session] = await Promise.all([
    fetchAdvisorDashboard(),
    fetchAdvisorTodaysSessionsAndCalls(),
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
      todaysSessionsAndCalls={todaysSessionsAndCalls}
      welcome={{ firstName, displayName, title }}
    />
  );
}