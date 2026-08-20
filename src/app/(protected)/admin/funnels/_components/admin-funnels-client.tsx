"use client";

import { useState } from "react";

import type { AdminFunnelKey } from "@/app/(protected)/admin/funnels/_lib/fetch-funnel-students-list";
import type { FunnelStats } from "@/lib/funnel-stats";

import { AdminFunnelStudentsDialog } from "./admin-funnel-students-dialog";

const fontSerif = '"DM Serif Display", Georgia, serif' as const;

type FunnelCardConfig = {
  key: AdminFunnelKey;
  title: string;
  stats: FunnelStats;
  color: string;
};

type AdminFunnelsClientProps = {
  funnels: FunnelCardConfig[];
};

function FunnelCard({
  title,
  path,
  visits,
  signups,
  color,
  onView,
}: {
  title: string;
  path: string;
  visits: number;
  signups: number;
  color: string;
  onView: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white px-5 py-[18px]">
      <div className="absolute left-0 right-0 top-0 h-[3px]" style={{ background: color }} />
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="text-[13px] font-semibold text-[#1a1a1a]">{title}</div>
        <button
          type="button"
          onClick={onView}
          className="shrink-0 rounded-lg border border-[#e0deda] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#2D6A4F] transition-colors hover:border-[#2D6A4F] hover:bg-[#f0f7f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D6A4F]"
        >
          View
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div
            className="mb-0.5 text-[26px] leading-none"
            style={{ fontFamily: fontSerif, color }}
          >
            {visits.toLocaleString()}
          </div>
          <div className="text-[11px] font-medium text-[#6a6a6a]">Landing page visits</div>
        </div>
        <div>
          <div
            className="mb-0.5 text-[26px] leading-none"
            style={{ fontFamily: fontSerif, color }}
          >
            {signups.toLocaleString()}
          </div>
          <div className="text-[11px] font-medium text-[#6a6a6a]">Signups</div>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-[#9a9a9a]">Tracked path: {path}</p>
    </div>
  );
}

export function AdminFunnelsClient({ funnels }: AdminFunnelsClientProps) {
  const [openFunnel, setOpenFunnel] = useState<{
    key: AdminFunnelKey;
    label: string;
  } | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
        {funnels.map((funnel) => (
          <FunnelCard
            key={funnel.key}
            title={funnel.title}
            path={funnel.stats.landingPath}
            visits={funnel.stats.visits}
            signups={funnel.stats.signups}
            color={funnel.color}
            onView={() => setOpenFunnel({ key: funnel.key, label: funnel.title })}
          />
        ))}
      </div>

      <AdminFunnelStudentsDialog
        openFunnel={openFunnel}
        onClose={() => setOpenFunnel(null)}
      />
    </>
  );
}
