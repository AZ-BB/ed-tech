"use client";

import { LocalizedLink } from "@/lib/i18n/localized-link";
import { useLocale } from "@/lib/i18n/locale-context";

export function LandingFooter() {
  const { dict } = useLocale();

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <div className="footer-brand">{dict.common.brand}</div>
          <p className="footer-tagline">{dict.footer.tagline}</p>
        </div>
        <div className="footer-col">
          <h5>{dict.footer.platform}</h5>
          <ul>
            <li>
              <LocalizedLink href="/for-schools">{dict.nav.forSchools}</LocalizedLink>
            </li>
            <li>
              <LocalizedLink href="/webinars">{dict.nav.webinars}</LocalizedLink>
            </li>
            <li>
              <LocalizedLink href="/for-advisors">{dict.nav.forAdvisors}</LocalizedLink>
            </li>
          </ul>
        </div>
        <div className="footer-col">
          <h5>{dict.footer.company}</h5>
          <ul>
            <li>
              <LocalizedLink href="/about">{dict.nav.about}</LocalizedLink>
            </li>
            <li>
              <LocalizedLink href="/blog">{dict.footer.blog}</LocalizedLink>
            </li>
            <li>
              <LocalizedLink href="/contact">{dict.footer.contact}</LocalizedLink>
            </li>
          </ul>
        </div>
        <div className="footer-col">
          <h5>{dict.footer.legal}</h5>
          <ul>
            <li>
              <LocalizedLink href="/privacy">{dict.footer.privacy}</LocalizedLink>
            </li>
            <li>
              <LocalizedLink href="/terms">{dict.footer.terms}</LocalizedLink>
            </li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <div>{dict.footer.copyright}</div>
      </div>
    </footer>
  );
}
