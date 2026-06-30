"use client";

import { LanguageSwitcher } from "@/lib/i18n/language-switcher";
import { LocalizedLink } from "@/lib/i18n/localized-link";
import { useLocale, useLocaleContext } from "@/lib/i18n/locale-context";

export function MarketingSubpageNav() {
  const { dict } = useLocale();
  const hasLocale = useLocaleContext() !== null;

  return (
    <nav className="nav" id="navbar" dir="ltr">
      <LocalizedLink className="nav-logo" href="/">
        <div className="nav-logo-icon">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        {dict.common.brand}
      </LocalizedLink>
      <div className="nav-links">
        <LocalizedLink className="nav-link" href="/#how-it-works">
          {dict.nav.howItWorks}
        </LocalizedLink>
        <LocalizedLink className="nav-link" href="/#features">
          {dict.nav.features}
        </LocalizedLink>
        <LocalizedLink className="nav-link" href="/#testimonials">
          {dict.nav.testimonials}
        </LocalizedLink>
        <LocalizedLink className="nav-link" href="/webinars">
          {dict.nav.webinars}
        </LocalizedLink>
        <LocalizedLink className="nav-link" href="/#faq">
          {dict.nav.faq}
        </LocalizedLink>
        {hasLocale ? <LanguageSwitcher /> : null}
        <LocalizedLink className="nav-login" href="/login">
          {dict.nav.logIn}
        </LocalizedLink>
        <LocalizedLink className="nav-cta" href="/signup">
          {dict.nav.startJourney}
        </LocalizedLink>
      </div>
    </nav>
  );
}
