import { WebinarDetailClient } from "@/app/(protected)/student/webinars/_components/webinar-detail-client";
import { MarketingSubpageNav } from "@/components/landing/marketing-subpage-chrome";
import { LandingFooter } from "@/components/landing/landing-footer";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

import { fetchPublicWebinarById } from "../_lib/fetch-public-webinars";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string; locale: Locale }> };

function parseWebinarId(idRaw: string): number | null {
  const id = Number.parseInt(idRaw, 10);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: idRaw, locale } = await params;
  const dict = await getDictionary(locale);
  const id = parseWebinarId(idRaw);
  if (!id) {
    return { title: dict.webinars.notFound };
  }

  const webinar = await fetchPublicWebinarById(id);
  if (!webinar) {
    return { title: dict.webinars.notFound };
  }

  return {
    title: webinar.title,
    description: webinar.description,
  };
}

export default async function PublicWebinarDetailPage({ params }: PageProps) {
  const { id: idRaw } = await params;
  const id = parseWebinarId(idRaw);
  if (!id) {
    notFound();
  }

  const webinar = await fetchPublicWebinarById(id);
  if (!webinar) {
    notFound();
  }

  return (
    <>
      <MarketingSubpageNav />

      <div className="page-wrap">
        <WebinarDetailClient initialWebinar={webinar} mode="public" />
      </div>

      <LandingFooter />
    </>
  );
}
