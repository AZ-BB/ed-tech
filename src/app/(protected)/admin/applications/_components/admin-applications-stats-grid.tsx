import {
  ADMIN_APPLICATION_STATUS_LABEL,
  type ApplicationStatus,
} from "../_lib/application-status-labels";
import type { AdminApplicationsStats } from "../_lib/fetch-admin-applications-stats";

const fontSerif = '"DM Serif Display", Georgia, serif' as const;

type StatCard = {
  key: string;
  label: string;
  value: number;
  accentColor: string;
  valueColor: string;
};

const STATUS_CARD_COLORS: Record<ApplicationStatus, { accent: string; value: string }> = {
  lead: { accent: "#E67E22", value: "#E67E22" },
  not_suitable: { accent: "#E74C3C", value: "#E74C3C" },
  payment_requested: { accent: "#F57F17", value: "#F57F17" },
  active_package: { accent: "#2D6A4F", value: "#2D6A4F" },
};

const STATUS_CARD_ORDER: ApplicationStatus[] = [
  "lead",
  "payment_requested",
  "active_package",
  "not_suitable",
];

export type AdminApplicationsStatsGridProps = Pick<
  AdminApplicationsStats,
  "lead" | "not_suitable" | "payment_requested" | "active_package"
>;

export function AdminApplicationsStatsGrid({
  lead,
  not_suitable,
  payment_requested,
  active_package,
}: AdminApplicationsStatsGridProps) {
  const counts: Record<ApplicationStatus, number> = {
    lead,
    not_suitable,
    payment_requested,
    active_package,
  };

  const cards: StatCard[] = STATUS_CARD_ORDER.map((status) => {
    const colors = STATUS_CARD_COLORS[status];
    return {
      key: status,
      label: ADMIN_APPLICATION_STATUS_LABEL[status],
      value: counts[status],
      accentColor: colors.accent,
      valueColor: colors.value,
    };
  });

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
            {card.value.toLocaleString()}
          </div>
          <div className="text-[11px] font-medium text-[#6a6a6a]">{card.label}</div>
        </div>
      ))}
    </div>
  );
}
