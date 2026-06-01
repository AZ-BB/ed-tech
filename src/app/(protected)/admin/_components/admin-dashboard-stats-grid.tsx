import type { AdminDashboardPayload } from "../_lib/fetch-admin-dashboard";

const fontSerif = '"DM Serif Display", Georgia, serif' as const;

export function AdminDashboardStatsGrid({
  cards,
}: {
  cards: AdminDashboardPayload["kpis"];
}) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-[14px] sm:grid-cols-2 xl:grid-cols-5">
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
            {card.value.toLocaleString()}
          </div>
          <div className="text-[11px] font-medium text-[#6a6a6a]">{card.label}</div>
          <div
            className={`mt-1.5 text-[10px] font-semibold ${
              card.trend.direction === "up"
                ? "text-[#2D6A4F]"
                : card.trend.direction === "down"
                  ? "text-[#E74C3C]"
                  : "text-[#7b7b7b]"
            }`}
          >
            {card.trend.label}
          </div>
        </div>
      ))}
    </div>
  );
}
