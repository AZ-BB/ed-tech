import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingPageContent } from "@/components/landing/landing-page-content";
import { LandingStickyCta } from "@/components/landing/landing-sticky-cta";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getActiveInfluencerFunnelBySlug } from "@/lib/influencer-funnels";
import { influencerFunnelLandingVisitPath } from "@/lib/influencer-funnel-slugs";
import { isReservedInfluencerSlug } from "@/lib/influencer-funnel-slugs";
import { incrementPageVisit } from "@/lib/page-visits";
import { getPublicSiteBaseUrl } from "@/lib/resend/site-url";
import { LandingPageJsonLd } from "@/lib/seo/landing-page-json-ld";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: Locale; influencerSlug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, influencerSlug } = await params;
  const funnel = await getActiveInfluencerFunnelBySlug(influencerSlug);
  if (!funnel || isReservedInfluencerSlug(influencerSlug.toLowerCase())) {
    return { title: "Not found" };
  }

  const dict = await getDictionary(locale);
  const baseUrl = await getPublicSiteBaseUrl();
  const canonical = `${baseUrl}/${locale}/${funnel.slug}`;

  return {
    title: dict.home.metadataTitle,
    description: dict.home.metadataDescription,
    alternates: {
      canonical,
      languages: {
        en: `${baseUrl}/en/${funnel.slug}`,
        ar: `${baseUrl}/ar/${funnel.slug}`,
        "x-default": `${baseUrl}/en/${funnel.slug}`,
      },
    },
    openGraph: {
      title: dict.home.metadataTitle,
      description: dict.home.metadataDescription,
      url: canonical,
      siteName: dict.common.brand,
      locale: locale === "ar" ? "ar_AE" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: dict.home.metadataTitle,
      description: dict.home.metadataDescription,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function DynamicInfluencerLandingPage({ params }: PageProps) {
  const { locale, influencerSlug } = await params;
  const normalizedSlug = influencerSlug.trim().toLowerCase();

  if (isReservedInfluencerSlug(normalizedSlug)) {
    notFound();
  }

  const funnel = await getActiveInfluencerFunnelBySlug(normalizedSlug);
  if (!funnel) {
    notFound();
  }

  if (locale === "ar") {
    await incrementPageVisit(influencerFunnelLandingVisitPath(funnel.slug));
  }

  const dict = await getDictionary(locale);
  const baseUrl = await getPublicSiteBaseUrl();
  const landingPath = `/${funnel.slug}`;
  const signupHref = `/${funnel.slug}/signup`;

  return (
    <>
      <LandingPageJsonLd dict={dict} locale={locale} baseUrl={baseUrl} />
      <LandingNav signupHref={signupHref} landingPath={landingPath} />
      <main className="main-content" id="main-content">
        <LandingPageContent dict={dict} locale={locale} signupHref={signupHref} />
      </main>
      <LandingStickyCta
        title={dict.home.stickyCtaTitle}
        sub={dict.home.stickyCtaSub}
        ctaLabel={dict.nav.startJourney}
        locale={locale}
        signupHref={signupHref}
      />
      <LandingFooter dict={dict} locale={locale} />
    </>
  );
}
