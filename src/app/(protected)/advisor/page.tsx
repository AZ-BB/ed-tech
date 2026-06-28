import { fetchAdvisorSessionProfile } from "@/lib/advisor-access";

import { AdvisorDashboard } from "./_components/advisor-dashboard";
import { fetchAdvisorDashboard } from "./_lib/fetch-advisor-dashboard";

export default async function AdvisorPage() {
  const [data, session] = await Promise.all([
    fetchAdvisorDashboard(),
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
      welcome={{ firstName, displayName, title }}
    />
  );
}