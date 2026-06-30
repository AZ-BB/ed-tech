"use client";

import { MarketingSubpageNav } from "@/components/landing/marketing-subpage-chrome";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LocalizedLink } from "@/lib/i18n/localized-link";
import { useLocale } from "@/lib/i18n/locale-context";

export default function BlogPage() {
  const { dict } = useLocale();
  const t = dict.blog;

  return (
    <>
      <MarketingSubpageNav />

      <div className="blog-soon-wrap">
        <div className="blog-soon-inner">
          <div className="blog-soon-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.8" aria-hidden>
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
          <h1 className="font-bold">{t.title}</h1>
          <p>{t.subtitle}</p>
          <div className="blog-soon-badge">{t.comingSoon}</div>
          <div>
            <LocalizedLink className="blog-back-btn" href="/">
              {t.backHome}
            </LocalizedLink>
          </div>
        </div>
      </div>

      <LandingFooter />
    </>
  );
}
