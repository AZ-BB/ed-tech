import {
  CUSTOM_WITH_FORM_LANDING_PAGE_PATH,
  getPageVisitCount,
  INFLUENCER_LANDING_PAGE_PATH,
} from "@/lib/page-visits";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Funnels",
};

const fontSerif = '"DM Serif Display", Georgia, serif' as const;

function VisitCard({
  count,
  label,
  path,
  color,
}: {
  count: number;
  label: string;
  path: string;
  color: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white px-5 py-[18px]">
      <div className="absolute left-0 right-0 top-0 h-[3px]" style={{ background: color }} />
      <div
        className="mb-0.5 text-[26px] leading-none"
        style={{ fontFamily: fontSerif, color }}
      >
        {count.toLocaleString()}
      </div>
      <div className="text-[11px] font-medium text-[#6a6a6a]">{label}</div>
      <p className="mt-1.5 text-[11px] text-[#9a9a9a]">Total views of {path}</p>
    </div>
  );
}

export default async function AdminFunnelsPage() {
  const [influencerLandingVisits, customWithFormLandingVisits] = await Promise.all([
    getPageVisitCount(INFLUENCER_LANDING_PAGE_PATH),
    getPageVisitCount(CUSTOM_WITH_FORM_LANDING_PAGE_PATH),
  ]);

  return (
    <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 xl:grid-cols-3">
      <VisitCard
        count={influencerLandingVisits}
        label="Influencer landing page visits"
        path={INFLUENCER_LANDING_PAGE_PATH}
        color="#2D6A4F"
      />
      <VisitCard
        count={customWithFormLandingVisits}
        label="Custom with form landing page visits"
        path={CUSTOM_WITH_FORM_LANDING_PAGE_PATH}
        color="#3498DB"
      />
    </div>
  );
}
