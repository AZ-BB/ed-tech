import { WebinarsClient } from "@/app/(protected)/student/webinars/_components/webinars-client";
import { MarketingSubpageNav } from "@/components/landing/marketing-subpage-chrome";
import { LandingFooter } from "@/components/landing/landing-footer";
import type { Metadata } from "next";

import { fetchPublicWebinarsPage } from "./_lib/fetch-public-webinars";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Webinars & Expert Sessions",
  description:
    "Join free live webinars led by advisors, alumni and professionals. Open to students and families across the Middle East.",
};

export default async function PublicWebinarsPage() {
  const webinars = await fetchPublicWebinarsPage();

  return (
    <>
      <MarketingSubpageNav />

      <div className="page-wrap">
        <WebinarsClient initialWebinars={webinars} mode="public" />
      </div>

      <LandingFooter />
    </>
  );
}
