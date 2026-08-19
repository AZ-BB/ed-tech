import {
  getPageVisitCount,
  INFLUENCER_LANDING_PAGE_PATH,
} from "@/lib/page-visits";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Funnels",
};

const fontSerif = '"DM Serif Display", Georgia, serif' as const;

export default async function AdminFunnelsPage() {
  const influencerLandingVisits = await getPageVisitCount(
    INFLUENCER_LANDING_PAGE_PATH,
  );

  return (
    <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 xl:grid-cols-3">
      <div className="relative overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white px-5 py-[18px]">
        <div className="absolute left-0 right-0 top-0 h-[3px] bg-[#2D6A4F]" />
        <div
          className="mb-0.5 text-[26px] leading-none text-[#2D6A4F]"
          style={{ fontFamily: fontSerif }}
        >
          {influencerLandingVisits.toLocaleString()}
        </div>
        <div className="text-[11px] font-medium text-[#6a6a6a]">
          Influencer landing page visits
        </div>
        <p className="mt-1.5 text-[11px] text-[#9a9a9a]">
          Total views of {INFLUENCER_LANDING_PAGE_PATH}
        </p>
      </div>
    </div>
  );
}
