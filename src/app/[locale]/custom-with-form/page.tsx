import type { Metadata } from "next";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingPageContent } from "@/components/landing/landing-page-content";
import { LandingStickyCta } from "@/components/landing/landing-sticky-cta";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getPublicSiteBaseUrl } from "@/lib/resend/site-url";
import { incrementPageVisit, CUSTOM_WITH_FORM_LANDING_PAGE_PATH } from "@/lib/page-visits";
import { LandingPageJsonLd } from "@/lib/seo/landing-page-json-ld";

const CUSTOM_WITH_FORM_LANDING_PATH = "/custom-with-form";
const CUSTOM_WITH_FORM_SIGNUP_HREF = "/custom-with-form/signup";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const baseUrl = await getPublicSiteBaseUrl();
  const canonical = `${baseUrl}/${locale}/custom-with-form`;

  return {
    title: dict.home.metadataTitle,
    description: dict.home.metadataDescription,
    alternates: {
      canonical,
      languages: {
        en: `${baseUrl}/en/custom-with-form`,
        ar: `${baseUrl}/ar/custom-with-form`,
        "x-default": `${baseUrl}/en/custom-with-form`,
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

export default async function CustomWithFormLandingPage({ params }: PageProps) {
  const { locale } = await params;
  if (locale === "ar") {
    await incrementPageVisit(CUSTOM_WITH_FORM_LANDING_PAGE_PATH);
  }
  const dict = await getDictionary(locale);
  const baseUrl = await getPublicSiteBaseUrl();

  return (
    <>
      <LandingPageJsonLd dict={dict} locale={locale} baseUrl={baseUrl} />
      <LandingNav
        signupHref={CUSTOM_WITH_FORM_SIGNUP_HREF}
        landingPath={CUSTOM_WITH_FORM_LANDING_PATH}
      />
      <main className="main-content" id="main-content">
        <LandingPageContent
          dict={dict}
          locale={locale}
          signupHref={CUSTOM_WITH_FORM_SIGNUP_HREF}
        />
      </main>
      <LandingStickyCta
        title={dict.home.stickyCtaTitle}
        sub={dict.home.stickyCtaSub}
        ctaLabel={dict.nav.startJourney}
        locale={locale}
        signupHref={CUSTOM_WITH_FORM_SIGNUP_HREF}
      />
      <LandingFooter dict={dict} locale={locale} />
    </>
  );
}
