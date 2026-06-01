import type { AdminDashboardPayload } from "../_lib/fetch-admin-dashboard";
import { AdminDashboardQuickActions } from "./admin-dashboard-quick-actions";
import { AdminDashboardRankings } from "./admin-dashboard-rankings";
import { AdminDashboardStatsGrid } from "./admin-dashboard-stats-grid";
import { AdminDashboardTimeline } from "./admin-dashboard-timeline";

export function AdminDashboard({ data }: { data: AdminDashboardPayload }) {
  return (
    <div>
      <AdminDashboardStatsGrid cards={data.kpis} />
      <AdminDashboardQuickActions />
      <div className="mb-6 grid grid-cols-1 items-stretch gap-[14px] xl:grid-cols-2">
        <AdminDashboardTimeline
          title="Recent Activity"
          items={data.recentActivity}
          emptyLabel="No recent activity yet."
        />
        <AdminDashboardTimeline
          title="Needs Attention"
          items={data.attentionItems}
          emptyLabel="No urgent items right now."
        />
      </div>
      <AdminDashboardRankings
        topSchools={data.topSchools}
        topUniversities={data.topUniversities}
        topDestinations={data.topDestinations}
      />
    </div>
  );
}
