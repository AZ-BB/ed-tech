"use client";

import { MarketingSubpageNav } from "@/components/landing/marketing-subpage-chrome";
import { LandingFooter } from "@/components/landing/landing-footer";
import { useLocale } from "@/lib/i18n/locale-context";

export default function TermsPage() {
  const { dict } = useLocale();
  const t = dict.terms;

  return (
    <>
      <MarketingSubpageNav />

      <div className="page-header">
        <h1>{t.title}</h1>
        <p>{t.effectiveDate}</p>
      </div>

      <div className="content">
        {t.sections.map((section) => (
          <div key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
            {"list" in section && section.list ? (
              <ul>
                {section.list.map((item) => (
                  <li key={item.slice(0, 40)}>{item}</li>
                ))}
              </ul>
            ) : null}
            {"afterList" in section && section.afterList ? <p>{section.afterList}</p> : null}
          </div>
        ))}
      </div>

      <LandingFooter />
    </>
  );
}
