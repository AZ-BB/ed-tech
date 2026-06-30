"use client";

import { HowItWorksCta } from "@/components/landing/how-it-works-cta";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LocalizedLink } from "@/lib/i18n/localized-link";
import { useLocale } from "@/lib/i18n/locale-context";
import type { ReactNode } from "react";

const FEATURE_ICONS: { bg: string; stroke: string; paths: ReactNode }[] = [
  {
    bg: "#FCEBEB",
    stroke: "#A32D2D",
    paths: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 000 20M12 2a14.5 14.5 0 010 20M2 12h20" />
      </>
    ),
  },
  {
    bg: "#E6F1FB",
    stroke: "#185FA5",
    paths: (
      <>
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </>
    ),
  },
  {
    bg: "#E6F1FB",
    stroke: "#185FA5",
    paths: <path d="M12 2l3 6.5L22 9l-5 4.9L18.2 21 12 17.3 5.8 21 7 13.9 2 9l7-0.5z" />,
  },
  {
    bg: "#EEEDFE",
    stroke: "#534AB7",
    paths: (
      <>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
  },
  {
    bg: "var(--green-bg)",
    stroke: "#2D6A4F",
    paths: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </>
    ),
  },
  {
    bg: "#FAEEDA",
    stroke: "#854F0B",
    paths: (
      <>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </>
    ),
  },
  {
    bg: "#FAEEDA",
    stroke: "#854F0B",
    paths: (
      <>
        <path d="M22 2L11 13" />
        <path d="M22 2l-7 20-4-9-9-4 20-7z" />
      </>
    ),
  },
  {
    bg: "var(--green-bg)",
    stroke: "#2D6A4F",
    paths: (
      <>
        <path d="M20 21v-2a4 4 0 00-4-4h-4" />
        <circle cx="8" cy="7" r="4" />
        <path d="M22 11l-4 4-2-2" />
      </>
    ),
  },
];

export function LandingPageContent() {
  const { dict, locale } = useLocale();
  const h = dict.home;

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-badge fade-up d1">
              <div className="hero-badge-dot" />
              {h.heroBadge}
            </div>
            <h1 className="serif fade-up d2">
              {locale === "ar" ? (
                <>
                  من الحيرة إلى <em>{h.heroTitleEm}</em>
                </>
              ) : (
                <>
                  From confusion to <em>{h.heroTitleEm}</em>
                </>
              )}
            </h1>
            <p className="hero-sub fade-up d3">{h.heroSub}</p>
            <div className="hero-ctas fade-up d4">
              <LocalizedLink href="/signup" style={{ textDecoration: "none" }}>
                <button type="button" className="btn-hero">
                  {dict.nav.startJourney}{" "}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="icon-directional"
                    aria-hidden
                  >
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </button>
              </LocalizedLink>
              <LocalizedLink href="/login" style={{ textDecoration: "none" }}>
                <button type="button" className="btn-ghost">
                  {dict.nav.logIn}
                </button>
              </LocalizedLink>
            </div>
          </div>
          <div className="hero-right fade-in d5">
            <div className="hero-visual">
              <div className="hv-card hv-1">
                <div className="hv-uni">
                  <div className="hv-uni-icon">🇨🇦</div>
                  <div>
                    <div className="hv-uni-name">University of Toronto</div>
                    <div className="hv-uni-loc">Toronto, Canada</div>
                  </div>
                </div>
                <div>
                  <span className="hv-pill hv-match">95% match</span>
                  <span className="hv-pill hv-tag">Business</span>
                  <span className="hv-pill hv-tag">Top 30</span>
                </div>
              </div>
              <div className="hv-card hv-2">
                <div className="hv-score">
                  <div className="hv-score-circle">7.5</div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600 }}>Essay score</div>
                    <div className="hv-score-text">Strong intro, improve conclusion</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="how-it-works">
        <div className="section-inner">
          <div className="section-label">{h.howItWorksLabel}</div>
          <div className="section-title serif">{h.howItWorksTitle}</div>
          <div className="section-sub">{h.howItWorksSub}</div>
          <div className="how-grid">
            <div className="how-line" />
            {h.steps.map((step, i) => (
              <div key={step.title} className="how-step">
                <div className="how-num">{i + 1}</div>
                <div className="how-step-title">{step.title}</div>
                <div className="how-step-desc">{step.desc}</div>
              </div>
            ))}
          </div>
          <HowItWorksCta />
        </div>
      </section>

      <section className="features-section" id="features">
        <div className="section-inner">
          <div className="section-label">{h.featuresLabel}</div>
          <div className="section-title serif">{h.featuresTitle}</div>
          <div className="section-sub">{h.featuresSub}</div>
          <div className="feat-grid">
            {h.features.map((feat, i) => {
              const icon = FEATURE_ICONS[i];
              return (
                <div key={feat.name} className="feat-card">
                  <div
                    className="feat-icon"
                    style={{ background: icon?.bg ?? "var(--green-bg)" }}
                  >
                    {icon ? (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={icon.stroke}
                        strokeWidth="1.8"
                        aria-hidden
                      >
                        {icon.paths}
                      </svg>
                    ) : null}
                  </div>
                  <div className="feat-name">{feat.name}</div>
                  <div className="feat-desc">{feat.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="proof-section">
        <div className="section-inner" style={{ textAlign: "center" }}>
          <div className="section-label" style={{ textAlign: "center" }}>
            {h.proofLabel}
          </div>
          <div className="section-title serif" style={{ maxWidth: "100%", textAlign: "center", margin: "0 auto 0" }}>
            {h.proofTitle}
          </div>
          <div className="proof-grid">
            {h.proofStats.map((stat) => (
              <div key={stat.label} className="proof-card">
                <div className="proof-num">{stat.num}</div>
                <div className="proof-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="testi-section" id="testimonials">
        <div className="section-inner">
          <div className="section-label">{h.testiLabel}</div>
          <div className="section-title serif">{h.testiTitle}</div>
          <div className="testi-grid">
            {h.testimonials.map((t, i) => (
              <div key={t.name} className="testi-card">
                <div className="testi-quote">{t.quote}</div>
                <div className="testi-author">
                  <div className="testi-avatar" style={{ background: i === 0 ? "var(--green-bg)" : i === 1 ? "#E6F1FB" : "#FAEEDA" }}>
                    {t.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="testi-name">{t.name}</div>
                    <div className="testi-uni">{t.uni}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mission-section">
        <div className="mission-inner">
          <div className="mission-label">{h.missionLabel}</div>
          <div className="mission-title serif">{h.missionTitle}</div>
          <div className="mission-desc">{h.missionDesc}</div>
        </div>
      </section>

      <LandingFaq />

      <section className="cta-section">
        <div className="cta-card">
          <div className="cta-title serif">{h.ctaTitle}</div>
          <div className="cta-sub">{h.ctaSub}</div>
          <div className="cta-btns">
            <LocalizedLink href="/signup" style={{ textDecoration: "none" }}>
              <button type="button" className="btn-hero">
                {h.signUp}{" "}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="icon-directional" aria-hidden>
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </button>
            </LocalizedLink>
            <LocalizedLink href="/login" style={{ textDecoration: "none" }}>
              <button type="button" className="btn-ghost">
                {dict.nav.logIn}
              </button>
            </LocalizedLink>
          </div>
        </div>
      </section>
    </>
  );
}
