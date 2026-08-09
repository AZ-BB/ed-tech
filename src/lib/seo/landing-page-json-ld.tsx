import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

const LANDING_VIDEO_URL =
  "https://cqtqhrvyakjiafaxpijd.supabase.co/storage/v1/object/public/landing-page/landing.mp4";

type LandingPageJsonLdProps = {
  dict: Dictionary;
  locale: Locale;
  baseUrl: string;
};

function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function LandingPageJsonLd({
  dict,
  locale,
  baseUrl,
}: LandingPageJsonLdProps) {
  const h = dict.home;
  const pageUrl = `${baseUrl}/${locale}`;

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: dict.common.brand,
    url: baseUrl,
    description: h.metadataDescription,
    areaServed: {
      "@type": "Place",
      name: locale === "ar" ? "الشرق الأوسط" : "Middle East",
    },
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: dict.common.brand,
    url: baseUrl,
    inLanguage: locale,
    description: h.metadataDescription,
    potentialAction: {
      "@type": "SearchAction",
      target: `${baseUrl}/${locale}/signup`,
      "query-input": "required name=search_term_string",
    },
  };

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: h.metadataTitle,
    description: h.metadataDescription,
    url: pageUrl,
    inLanguage: locale,
    isPartOf: {
      "@type": "WebSite",
      name: dict.common.brand,
      url: baseUrl,
    },
  };

  const video = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: h.videoTitle,
    description: h.videoSub,
    contentUrl: LANDING_VIDEO_URL,
    thumbnailUrl: `${baseUrl}/landing/hero/hero-1.jpeg`,
    uploadDate: "2026-01-01",
    inLanguage: locale,
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: h.faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <>
      <JsonLdScript data={organization} />
      <JsonLdScript data={website} />
      <JsonLdScript data={webPage} />
      <JsonLdScript data={video} />
      <JsonLdScript data={faqPage} />
    </>
  );
}
