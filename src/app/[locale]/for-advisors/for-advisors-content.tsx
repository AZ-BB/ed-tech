"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LocalizedLink } from "@/lib/i18n/localized-link";
import { useLocale } from "@/lib/i18n/locale-context";

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
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
  );
}

const SUPPORT_ICONS: ReactNode[] = [
  <svg key="0" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>,
  <svg key="1" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  </svg>,
  <svg key="2" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
  </svg>,
  <svg key="3" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
  </svg>,
  <svg key="4" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
    <path d="M19 10v2a7 7 0 01-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>,
  <svg key="5" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <path d="M16 8h-6a2 2 0 100 4h4a2 2 0 110 4H8" />
    <line x1="12" y1="6" x2="12" y2="18" />
  </svg>,
];

const WHY_ICONS: ReactNode[] = [
  <svg key="0" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  </svg>,
  <svg key="1" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  </svg>,
  <svg key="2" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
  </svg>,
  <svg key="3" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>,
  <svg key="4" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>,
];

export function ForAdvisorsContent() {
  const { dict } = useLocale();
  const t = dict.forAdvisors;

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              {t.heroBadge}
            </div>
            <h1>
              {t.heroTitlePrefix} <em>{t.heroTitleEmphasis}</em>
              {t.heroTitleSuffix}
            </h1>
            <p className="hero-sub">{t.heroSub}</p>
            <div className="hero-ctas">
              <LocalizedLink href="/contact" className="btn btn-primary">
                {t.applyAsAdvisor}
              </LocalizedLink>
              <Link href="#how" className="btn btn-secondary">
                {t.howItWorks}
              </Link>
            </div>
          </div>
          <div className="hero-right">
            <div className="av-hero-visual">
              <div className="av-card profile">
                <div className="av-profile-top">
                  <div className="av-avatar-wrap">
                    <div className="av-avatar">SK</div>
                    <div className="av-online" />
                  </div>
                  <div className="av-name-block">
                    <div className="av-name">Sarah Khalil</div>
                    <div className="av-title">Admissions Advisor · 8 yrs</div>
                    <div className="av-rating">
                      <span className="av-stars">★★★★★</span> 4.9 · 84 sessions
                    </div>
                  </div>
                </div>
                <div className="av-tags">
                  <span className="av-tag">US admissions</span>
                  <span className="av-tag">UK · UCAS</span>
                  <span className="av-tag">Common App</span>
                  <span className="av-tag">Essays</span>
                  <span className="av-tag">Scholarships</span>
                </div>
                <div className="av-stats">
                  <div>
                    <div className="av-stat-val">84</div>
                    <div className="av-stat-label">{t.statSessions}</div>
                  </div>
                  <div>
                    <div className="av-stat-val">23</div>
                    <div className="av-stat-label">{t.statStudents}</div>
                  </div>
                  <div>
                    <div className="av-stat-val">4.9</div>
                    <div className="av-stat-label">{t.statRating}</div>
                  </div>
                </div>
              </div>
              <div className="av-card session">
                <div className="av-session-head">
                  <div className="av-session-label">{t.upcoming}</div>
                  <div className="av-session-tag">{t.today}</div>
                </div>
                <div className="av-session-title">Common App essay review</div>
                <div className="av-session-time">4:30 PM · 45 min</div>
                <div className="av-session-with">
                  <div className="av-session-mini-avatar">OK</div>
                  <span>
                    {t.withPrefix} <strong>Omar K.</strong> · Y13 · UAE
                  </span>
                </div>
              </div>
              <div className="av-card request">
                <div className="av-request-head">
                  <div className="av-request-from">
                    <div className="av-request-mini-avatar">LA</div>
                    <span>
                      <strong>Layla A.</strong>
                    </span>
                  </div>
                  <div className="av-request-time">2 hrs ago</div>
                </div>
                <div className="av-request-msg">
                  &quot;Hi Sarah, I&apos;m applying to LSE for Economics. Can we
                  review my personal statement?&quot;
                </div>
                <div className="av-request-action">{t.viewRequest}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-light">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-label">{t.whyLabel}</div>
            <h2 className="section-title">
              {t.whyTitlePrefix} <em>{t.whyTitleEmphasis}</em>
            </h2>
            <p className="section-desc">{t.whyDesc}</p>
          </div>
          <div className="why-grid">
            {t.whyCards.map((card, i) => (
              <div
                key={card.title}
                className={i === 0 ? "why-card feature" : "why-card"}
              >
                <div className="w-icon">{WHY_ICONS[i]}</div>
                <h3 className="w-title">{card.title}</h3>
                <p className="w-desc">{card.desc}</p>
                {i === 0 && "quote" in card && (
                  <div className="feature-quote">
                    &quot;{card.quote}&quot;
                    <div className="feature-quote-author">
                      <div className="feature-quote-avatar">AS</div>
                      <span>Ahmed S. · Senior Advisor</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-label">{t.howLabel}</div>
            <h2 className="section-title">
              {t.howTitlePrefix} <em>{t.howTitleEm1}</em> {t.howTitleBetween}{" "}
              <em>{t.howTitleEm2}</em>.
            </h2>
            <p className="section-desc">{t.howDesc}</p>
          </div>
          <div className="aj-grid">
            {t.journeySteps.map((step, i) => (
              <div key={step.title} className="aj-step">
                <div className="aj-num">{i + 1}</div>
                <div className="aj-content">
                  <h3>{step.title}</h3>
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
            <div className="section-label">{t.supportLabel}</div>
            <h2 className="section-title">
              {t.supportTitlePrefix} <em>{t.supportTitleEmphasis}</em>
            </h2>
            <p className="section-desc">{t.supportDesc}</p>
          </div>
          <div className="support-grid">
            {t.supportAreas.map((area, i) => (
              <div key={area.title} className="support-card">
                <div className="support-icon">{SUPPORT_ICONS[i]}</div>
                <h4>{area.title}</h4>
                <p>{area.desc}</p>
                <span className="support-tag">{area.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-label">{t.diffLabel}</div>
            <h2 className="section-title">
              {t.diffTitlePrefix} <em>{t.diffTitleEmphasis}</em>
            </h2>
            <p className="section-desc">{t.diffDesc}</p>
          </div>
          <div className="diff-grid">
            <div className="diff-content">
              <h3>
                {t.diffHeadingPrefix} <em>{t.diffHeadingEmphasis}</em>.
              </h3>
              <p className="lead">{t.diffLead}</p>
              <div className="diff-points">
                {t.diffPoints.map((point) => (
                  <div key={point.title} className="diff-point">
                    <div className="diff-check">
                      <CheckIcon />
                    </div>
                    <div className="diff-point-text">
                      <b>{point.title}</b>
                      <span>{point.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="diff-profile-wrap">
              <div className="diff-profile">
                <div className="diff-profile-header">
                  <div className="diff-profile-avatar">YR</div>
                  <div>
                    <div className="diff-profile-name">Yusuf Rashid</div>
                    <div className="diff-profile-yr">
                      Year 12 · British curriculum
                    </div>
                  </div>
                </div>
                <div className="diff-profile-row">
                  <div className="diff-profile-row-label">{t.profileSchool}</div>
                  <div className="diff-profile-row-val">Partner School · UAE</div>
                </div>
                <div className="diff-profile-row">
                  <div className="diff-profile-row-label">{t.profileTargetCountries}</div>
                  <div className="diff-profile-row-val">UK · US · Canada</div>
                </div>
                <div className="diff-profile-row">
                  <div className="diff-profile-row-label">{t.profileInterests}</div>
                  <div className="diff-profile-row-val">Engineering · Robotics</div>
                </div>
                <div className="diff-profile-row">
                  <div className="diff-profile-row-label">{t.profilePredictedGrades}</div>
                  <div className="diff-profile-row-val">A*AA</div>
                </div>
                <div className="diff-profile-section">
                  <div className="diff-profile-section-label">{t.profileTopTraits}</div>
                  <div className="diff-profile-tags">
                    <span className="diff-profile-tag">Analytical</span>
                    <span className="diff-profile-tag">Builder</span>
                    <span className="diff-profile-tag">Self-directed</span>
                    <span className="diff-profile-tag">STEM-oriented</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-inner">
          <div className="cta-box">
            <div className="cta-content">
              <h2 className="cta-title">
                {t.ctaTitlePrefix} <em>{t.ctaTitleEmphasis}</em>.
              </h2>
              <p className="cta-desc">{t.ctaDesc}</p>
              <div className="cta-buttons">
                <LocalizedLink href="/contact" className="btn btn-cta-primary">
                  {t.applyAsAdvisor}
                </LocalizedLink>
                <LocalizedLink href="/contact" className="btn btn-cta-secondary">
                  {t.talkToTeam}
                </LocalizedLink>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
