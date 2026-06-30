"use client";

import { ContactForm } from "./contact-form";
import { MarketingSubpageNav } from "@/components/landing/marketing-subpage-chrome";
import { LandingFooter } from "@/components/landing/landing-footer";
import { useLocale } from "@/lib/i18n/locale-context";

export default function ContactPage() {
  const { dict } = useLocale();
  const t = dict.contact;

  return (
    <>
      <MarketingSubpageNav />

      <div className="page-wrap">
        <div className="page-hero">
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>

        <div className="form-section">
          <ContactForm />
          <div className="support-info">
            <div className="support-divider" />
            <p>
              {t.reachUs}{" "}
              <strong>
                <a href="mailto:admin@univeera.me">admin@univeera.me</a>
              </strong>
            </p>
            <p>{t.responseTime}</p>
          </div>
        </div>
      </div>

      <LandingFooter />
    </>
  );
}
