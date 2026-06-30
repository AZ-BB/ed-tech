"use client";

import { useEffect } from "react";
import { LanguageSwitcher } from "@/lib/i18n/language-switcher";
import { LocalizedLink } from "@/lib/i18n/localized-link";
import { useLocale } from "@/lib/i18n/locale-context";

export function ForSchoolsNav() {
  const { dict } = useLocale();

  useEffect(() => {
    const nav = document.getElementById("navbar");
    const onScroll = () => {
      if (!nav) return;
      nav.classList.toggle("scrolled", window.scrollY > 20);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className="nav" id="navbar" dir="ltr">
      <LocalizedLink className="nav-logo" href="/">
        <div className="nav-logo-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" aria-hidden>
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        {dict.common.brand}
      </LocalizedLink>
      <div className="nav-links">
        <LocalizedLink className="nav-link active" href="/for-schools">
          {dict.nav.forSchools}
        </LocalizedLink>
        <LocalizedLink className="nav-link" href="/for-advisors">
          {dict.nav.forAdvisors}
        </LocalizedLink>
        <LocalizedLink className="nav-link" href="/about">
          {dict.nav.about}
        </LocalizedLink>
        <LanguageSwitcher />
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
