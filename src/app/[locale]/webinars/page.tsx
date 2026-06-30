import { WebinarsClient } from "@/app/(protected)/student/webinars/_components/webinars-client";
import { MarketingSubpageNav } from "@/components/landing/marketing-subpage-chrome";
import { LandingFooter } from "@/components/landing/landing-footer";
import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

import { fetchPublicWebinarsPage } from "./_lib/fetch-public-webinars";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  return {
    title: dict.webinars.metadataTitle,
    description: dict.webinars.metadataDescription,
  };
}

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
