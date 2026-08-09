import type { Metadata } from "next";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingPageContent } from "@/components/landing/landing-page-content";
import { LandingStickyCta } from "@/components/landing/landing-sticky-cta";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getPublicSiteBaseUrl } from "@/lib/resend/site-url";
import { LandingPageJsonLd } from "@/lib/seo/landing-page-json-ld";

type PageProps = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const baseUrl = await getPublicSiteBaseUrl();
  const canonical = `${baseUrl}/${locale}`;

  return {
    title: dict.home.metadataTitle,
    description: dict.home.metadataDescription,
    alternates: {
      canonical,
      languages: {
        en: `${baseUrl}/en`,
        ar: `${baseUrl}/ar`,
        "x-default": `${baseUrl}/en`,
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

export default async function Home({ params }: PageProps) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const baseUrl = await getPublicSiteBaseUrl();

  return (
    <>
      <LandingPageJsonLd dict={dict} locale={locale} baseUrl={baseUrl} />
      <LandingNav />
      <main className="main-content" id="main-content">
        <LandingPageContent dict={dict} locale={locale} />
      </main>
      <LandingStickyCta
        title={dict.home.stickyCtaTitle}
        sub={dict.home.stickyCtaSub}
        ctaLabel={dict.nav.startJourney}
        locale={locale}
      />
      <LandingFooter dict={dict} locale={locale} />
    </>
  );
}
