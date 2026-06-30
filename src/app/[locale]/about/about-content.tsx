"use client";

import { LocalizedLink } from "@/lib/i18n/localized-link";
import { useLocale } from "@/lib/i18n/locale-context";

import { AboutNav } from "./about-nav";

const STATIC_ASSETS_BASE =
  "https://cqtqhrvyakjiafaxpijd.supabase.co/storage/v1/object/public/static";

const ADVISORS = [
  { id: 1, name: "James T.", image: `${STATIC_ASSETS_BASE}/james.png` },
  { id: 2, name: "Ahmed M.", image: `${STATIC_ASSETS_BASE}/ahmed.png` },
  { id: 3, name: "Rana J.", image: `${STATIC_ASSETS_BASE}/rana.png` },
  { id: 4, name: "Nadia H.", image: `${STATIC_ASSETS_BASE}/nadia.png` },
  { id: 5, name: "Sarah K.", image: `${STATIC_ASSETS_BASE}/sarah.png` },
  { id: 6, name: "Omar B.", image: `${STATIC_ASSETS_BASE}/omar.png` },
] as const;

const COUNTRIES = [
  { flag: "🇦🇪", name: "UAE", status: "active" as const },
  { flag: "🇸🇦", name: "Saudi Arabia", status: "active" as const },
  { flag: "🇧🇭", name: "Bahrain", status: "active" as const },
  { flag: "🇶🇦", name: "Qatar", status: "active" as const },
  { flag: "🇰🇼", name: "Kuwait", status: "active" as const },
  { flag: "🇯🇴", name: "Jordan", status: "active" as const },
  { flag: "🇴🇲", name: "Oman", status: "expanding" as const },
  { flag: "🇪🇬", name: "Egypt", status: "expanding" as const },
] as const;

const JOURNEY_ICONS = [
  <svg
    key="confusion"
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>,
  <svg
    key="discovery"
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>,
  <svg
    key="exploration"
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  </svg>,
  <svg
    key="clarity"
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>,
];

const PROBLEM_ICONS = [
  <svg
    key="info"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
  </svg>,
  <svg
    key="direction"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>,
  <svg
    key="support"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <polyline points="16 3 21 3 21 8" />
    <line x1="4" y1="20" x2="21" y2="3" />
    <polyline points="21 16 21 21 16 21" />
    <line x1="15" y1="15" x2="21" y2="21" />
    <line x1="4" y1="4" x2="9" y2="9" />
  </svg>,
  <svg
    key="decisions"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>,
];

export function AboutContent() {
  const { dict } = useLocale();
  const d = dict.about;

  return (
    <>
      <AboutNav />

      <section className="hero about-hero">
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              {d.heroBadge}
            </div>
            <h1>
              {d.heroTitleStart} <em>{d.heroEmConfusion}</em>
              {d.heroTitleTo1} <em>{d.heroEmClarity}</em>
              {d.heroTitleTo2} <em>{d.heroEmConfidence}</em>.
            </h1>
            <p className="hero-sub">{d.heroSub}</p>

            <div className="hero-journey">
              <div className="hj-row">
                {d.journey.map((step, i) => (
                  <div
                    key={step.label}
                    className={`hj-step${i === 0 ? " start" : ""}${i === d.journey.length - 1 ? " end" : ""}`}
                  >
                    <div className="hj-dot">{JOURNEY_ICONS[i]}</div>
                    <div className="hj-label">{step.label}</div>
                    <div className="hj-sub">{step.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-light advisors-section">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-label">{d.advisorsLabel}</div>
            <h2 className="section-title">
              {d.advisorsTitleBefore} <em>{d.advisorsTitleEm}</em>{" "}
              {d.advisorsTitleAfter}
            </h2>
            <p className="section-desc">{d.advisorsDesc}</p>
          </div>

          <div className="advisors-grid">
            {ADVISORS.map((advisor) => (
              <div key={advisor.id} className="advisor-card">
                <div className="advisor-avatar-wrap">
                  <img
                    src={advisor.image}
                    alt={advisor.name}
                    className="advisor-avatar"
                  />
                </div>
                <div className="advisor-name bidi-ltr" dir="ltr">
                  {advisor.name}
                </div>
              </div>
            ))}
            <div className="advisor-card advisor-more">
              <div className="advisor-avatar-wrap">
                <div className="advisor-avatar advisor-more-circle">
                  <span className="advisor-more-text">{d.advisorMore}</span>
                </div>
              </div>
              <div className="advisor-name">{d.advisorGrowing}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mission-quote-section">
        <div className="mission-quote">
          {d.missionQuoteBefore} <em>{d.missionQuoteEmClarity}</em>
          {d.missionQuoteMid} <em>{d.missionQuoteEmConfusion}</em>
          {d.missionQuoteAfter}
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-label">{d.problemLabel}</div>
            <h2 className="section-title">
              {d.problemTitleBefore} <em>{d.problemTitleEm}</em>{" "}
              {d.problemTitleAfter}
            </h2>
            <p className="section-desc">{d.problemDesc}</p>
          </div>
          <div className="problem-grid">
            {d.problems.map((problem, i) => (
              <div key={problem.title} className="problem-card">
                <div className="problem-icon">{PROBLEM_ICONS[i]}</div>
                <h4>{problem.title}</h4>
                <p>{problem.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-light">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-label">{d.beliefsLabel}</div>
            <h2 className="section-title">
              {d.beliefsTitleBefore} <em>{d.beliefsTitleEm}</em>
              {d.beliefsTitleAfter}
            </h2>
            <p className="section-desc">{d.beliefsDesc}</p>
          </div>
          <div className="beliefs">
            {d.beliefCards.map((belief, i) => (
              <div key={belief.titleEm} className="belief-card">
                <div className="belief-num">{String(i + 1).padStart(2, "0")}</div>
                <h3 className="belief-title">
                  {belief.titleBefore} <em>{belief.titleEm}</em>
                  {belief.titleAfter}
                </h3>
                <p className="belief-desc">{belief.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-label">{d.platformLabel}</div>
            <h2 className="section-title">
              {d.platformTitleBefore} <em>{d.platformTitleEm1}</em>{" "}
              {d.platformTitleMid} <em>{d.platformTitleEm2}</em>
              {d.platformTitleAfter}
            </h2>
            <p className="section-desc">{d.platformDesc}</p>
          </div>
          <div className="staircase">
            {d.steps.map((step, i) => (
              <div key={step.title} className="stair-step">
                <div className="stair-num">{String(i + 1).padStart(2, "0")}</div>
                <div className="stair-content">
                  <h4>{step.title}</h4>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-light">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-label">{d.mvLabel}</div>
            <h2 className="section-title">
              {d.mvTitle} <em>{d.mvTitleEm}</em>
            </h2>
            <p className="section-desc">{d.mvDesc}</p>
          </div>
          <div className="mv-grid">
            <div className="mv-card">
              <div className="mv-label">{d.missionLabel}</div>
              <h3 className="mv-title">
                {d.missionTitleBefore} <em>{d.missionTitleEm}</em>
                {d.missionTitleAfter}
              </h3>
              <p className="mv-text">{d.missionText}</p>
            </div>
            <div className="mv-card dark">
              <div className="mv-label">{d.visionLabel}</div>
              <h3 className="mv-title">
                {d.visionTitleBefore} <em>{d.visionTitleEm}</em>
                {d.visionTitleAfter}
              </h3>
              <p className="mv-text">{d.visionText}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="region-section">
        <div className="region-inner">
          <div className="region-grid">
            <div className="region-content">
              <div className="section-label">{d.regionLabel}</div>
              <h2>
                {d.regionTitle} <em>{d.regionTitleEm}</em>
              </h2>
              <p>{d.regionDesc1}</p>
              <p>{d.regionDesc2}</p>
              <ul className="region-list">
                {d.regionList.map((item) => (
                  <li key={item} className="region-li">
                    <span className="region-li-check">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="region-visual">
              <div className="region-title">{d.regionVisualTitle}</div>
              <div className="region-subtitle">{d.regionVisualSubtitle}</div>
              <div className="country-grid">
                {COUNTRIES.map((country) => (
                  <div key={country.name} className="country-row">
                    <div className="country-row-name bidi-ltr" dir="ltr">
                      <span className="country-flag">{country.flag}</span>
                      {country.name}
                    </div>
                    <div className="country-status">
                      {country.status === "active"
                        ? d.statusActive
                        : d.statusExpanding}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section about-cta">
        <div className="cta-inner">
          <div className="cta-box">
            <div className="cta-content">
              <h2 className="cta-title">
                {d.ctaTitleBefore} <em>{d.ctaTitleEm}</em> {d.ctaTitleAfter}
              </h2>
              <p className="cta-desc">{d.ctaDesc}</p>
              <div className="cta-buttons">
                <LocalizedLink href="/contact" className="btn btn-cta-primary">
                  {d.ctaButton}
                </LocalizedLink>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
