import type { Metadata } from "next";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingPageContent } from "@/components/landing/landing-page-content";
import { LandingStickyCta } from "@/components/landing/landing-sticky-cta";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getPublicSiteBaseUrl } from "@/lib/resend/site-url";
import { TAREQ_LANDING_PAGE_PATH, incrementPageVisit } from "@/lib/page-visits";
import { LandingPageJsonLd } from "@/lib/seo/landing-page-json-ld";

const CUSTOM_LANDING_PATH = "/tareq";
const CUSTOM_SIGNUP_HREF = "/tareq/signup";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const baseUrl = await getPublicSiteBaseUrl();
  const canonical = `${baseUrl}/${locale}/tareq`;

  return {
    title: dict.home.metadataTitle,
    description: dict.home.metadataDescription,
    alternates: {
      canonical,
      languages: {
        en: `${baseUrl}/en/tareq`,
        ar: `${baseUrl}/ar/tareq`,
        "x-default": `${baseUrl}/en/tareq`,
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

export default async function TareqLandingPage({ params }: PageProps) {
  const { locale } = await params;
  if (locale === "ar") {
    await incrementPageVisit(TAREQ_LANDING_PAGE_PATH);
  }
  const dict = await getDictionary(locale);
  const baseUrl = await getPublicSiteBaseUrl();

  return (
    <>
      <LandingPageJsonLd dict={dict} locale={locale} baseUrl={baseUrl} />
      <LandingNav signupHref={CUSTOM_SIGNUP_HREF} landingPath={CUSTOM_LANDING_PATH} />
      <main className="main-content" id="main-content">
        <LandingPageContent
          dict={dict}
          locale={locale}
          signupHref={CUSTOM_SIGNUP_HREF}
        />
      </main>
      <LandingStickyCta
        title={dict.home.stickyCtaTitle}
        sub={dict.home.stickyCtaSub}
        ctaLabel={dict.nav.startJourney}
        locale={locale}
        signupHref={CUSTOM_SIGNUP_HREF}
      />
      <LandingFooter dict={dict} locale={locale} />
    </>
  );
}
