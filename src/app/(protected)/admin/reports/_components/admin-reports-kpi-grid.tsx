import type { AdminReportsOverview } from "../_lib/report-payloads";

const fontSerif = '"DM Serif Display", Georgia, serif' as const;

const KPI_CONFIG = [
  { key: "totalUsers", label: "Total Users", color: "#2D6A4F" },
  { key: "activeInRange", label: "Active in Range", color: "#3498DB" },
  { key: "totalShortlists", label: "Total Shortlists (in Range)", color: "#8E44AD" },
  { key: "tokensUsed", label: "Tokens Used (in Range)", color: "#E67E22" },
] as const;

export function AdminReportsKpiGrid({ overview }: { overview: AdminReportsOverview }) {
  const values: Record<(typeof KPI_CONFIG)[number]["key"], number> = {
    totalUsers: overview.totalUsers,
    activeInRange: overview.activeInRange,
    totalShortlists: overview.totalShortlists,
    tokensUsed: overview.tokensUsed,
  };

  return (
    <div className="mb-6 grid grid-cols-1 gap-[14px] sm:grid-cols-2 xl:grid-cols-4">
      {KPI_CONFIG.map((kpi) => (
        <div
          key={kpi.key}
          className="relative overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white px-5 py-[18px]"
        >
          <div
            className="absolute left-0 right-0 top-0 h-[3px]"
            style={{ background: kpi.color }}
          />
          <div
            className="mb-0.5 text-[26px] leading-none"
            style={{ fontFamily: fontSerif, color: kpi.color }}
          >
            {values[kpi.key].toLocaleString()}
          </div>
          <div className="text-[11px] font-medium text-[#6a6a6a]">{kpi.label}</div>
        </div>
      ))}
    </div>
  );
}
