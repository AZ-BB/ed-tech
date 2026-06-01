import type { AdminApplicationsStats } from "../_lib/fetch-admin-applications-stats";

const fontSerif = '"DM Serif Display", Georgia, serif' as const;

type StatCard = {
  key: string;
  label: string;
  value: string | number;
  accentColor: string;
  valueColor: string;
};

export type AdminApplicationsStatsGridProps = AdminApplicationsStats;

export function AdminApplicationsStatsGrid({
  activeCases,
  pendingAssignment,
  inProgress,
  submitted,
}: AdminApplicationsStatsGridProps) {
  const cards: StatCard[] = [
    {
      key: "active-cases",
      label: "Active Cases",
      value: activeCases,
      accentColor: "#E67E22",
      valueColor: "#E67E22",
    },
    {
      key: "pending-assignment",
      label: "Pending Assignment",
      value: pendingAssignment,
      accentColor: "#E74C3C",
      valueColor: "#E74C3C",
    },
    {
      key: "in-progress",
      label: "In Progress",
      value: inProgress,
      accentColor: "#3498DB",
      valueColor: "#3498DB",
    },
    {
      key: "submitted",
      label: "Submitted",
      value: submitted,
      accentColor: "#2D6A4F",
      valueColor: "#2D6A4F",
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 gap-[14px] sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className="relative overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white px-5 py-[18px]"
        >
          <div
            className="absolute left-0 right-0 top-0 h-[3px]"
            style={{ background: card.accentColor }}
          />
          <div
            className="mb-0.5 text-[26px] leading-none"
            style={{ fontFamily: fontSerif, color: card.valueColor }}
          >
            {typeof card.value === "number"
              ? card.value.toLocaleString()
              : card.value}
          </div>
          <div className="text-[11px] font-medium text-[#6a6a6a]">{card.label}</div>
        </div>
      ))}
    </div>
  );
}
