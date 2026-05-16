import Link from "next/link";

import { ForAdvisorsNav } from "@/app/for-advisors/for-advisors-nav";

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

const JOURNEY_STEPS = [
  {
    num: 1,
    title: "Apply to the network",
    desc: "Submit your background, credentials, and areas of expertise. Most applications are reviewed within five business days.",
  },
  {
    num: 2,
    title: "Build your profile",
    desc: "Create a public profile showcasing your specialties, experience, languages, regions, and the universities you know well.",
  },
  {
    num: 3,
    title: "Get matched with students",
    desc: "Our matching engine surfaces you to relevant students. They book directly through your calendar — no back-and-forth.",
  },
  {
    num: 4,
    title: "Deliver structured sessions",
    desc: "Hold sessions inside Univeera with full context — student profile, goals, application status, and previous notes.",
  },
] as const;

const SUPPORT_AREAS = [
  {
    title: "Pathway selection",
    desc: "Help students figure out what to study before they figure out where. Major exploration to career-program fit.",
    tag: "High demand",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
    ),
  },
  {
    title: "Country & university guidance",
    desc: "Advise on destinations, university tiers, fit factors, and the realities of studying abroad as a MENA student.",
    tag: "Specialised",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    ),
  },
  {
    title: "Application planning",
    desc: "Build application timelines, university lists, requirements checklists, and submission strategies.",
    tag: "Most requested",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      </svg>
    ),
  },
  {
    title: "Essay & statement coaching",
    desc: "Guide students through personal statements, supplementals, and Common App essays.",
    tag: "Top earning",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      </svg>
    ),
  },
  {
    title: "Interview preparation",
    desc: "Run mock interviews for medical, Oxbridge, Ivy, and competitive program admissions.",
    tag: "High value",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path d="M19 10v2a7 7 0 01-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    ),
  },
  {
    title: "Scholarships & financial aid",
    desc: "Help students navigate scholarship applications, need-based aid, and study-abroad funding.",
    tag: "Specialised",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <path d="M16 8h-6a2 2 0 100 4h4a2 2 0 110 4H8" />
        <line x1="12" y1="6" x2="12" y2="18" />
      </svg>
    ),
  },
] as const;

const DIFF_POINTS = [
  {
    title: "Real student profiles",
    desc: "Year of study, school, target countries, academic interests.",
  },
  {
    title: "Discovery Journey results",
    desc: "Six-module psychometric assessment showing strengths and pathway fit.",
  },
  {
    title: "School context",
    desc: "Partner school, year group, and prior counsellor notes when shared.",
  },
  {
    title: "Continuity across sessions",
    desc: "Your notes stay with the student. Next session picks up where you left off.",
  },
] as const;

export default function ForAdvisorsPage() {
  return (
    <>
      <ForAdvisorsNav />

      <section className="hero">
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              For advisors and mentors
            </div>
            <h1>
              Shape <em>real student journeys</em>. From anywhere.
            </h1>
            <p className="hero-sub">
              Join a curated network of MENA-focused university advisors. Meet
              motivated students. Deliver structured guidance. Build a meaningful
              side practice — or scale your existing one.
            </p>
            <div className="hero-ctas">
              <Link href="/contact" className="btn btn-primary">
                Apply as an advisor
              </Link>
              <Link href="#how" className="btn btn-secondary">
                How it works
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
                    <div className="av-stat-label">Sessions</div>
                  </div>
                  <div>
                    <div className="av-stat-val">23</div>
                    <div className="av-stat-label">Students</div>
                  </div>
                  <div>
                    <div className="av-stat-val">4.9</div>
                    <div className="av-stat-label">Rating</div>
                  </div>
                </div>
              </div>
              <div className="av-card session">
                <div className="av-session-head">
                  <div className="av-session-label">Upcoming</div>
                  <div className="av-session-tag">Today</div>
                </div>
                <div className="av-session-title">Common App essay review</div>
                <div className="av-session-time">4:30 PM · 45 min</div>
                <div className="av-session-with">
                  <div className="av-session-mini-avatar">OK</div>
                  <span>
                    With <strong>Omar K.</strong> · Y13 · UAE
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
                <div className="av-request-action">View request →</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-light">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-label">Why advisors join Univeera</div>
            <h2 className="section-title">
              More than tutoring. <em>A real practice.</em>
            </h2>
            <p className="section-desc">
              Univeera advisors aren&apos;t running freelance side gigs from inbox
              to inbox. They sit inside a structured platform that takes care of the
              operations — so they can focus on actually advising.
            </p>
          </div>
          <div className="why-grid">
            <div className="why-card feature">
              <div className="w-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
              </div>
              <h3 className="w-title">Meaningful impact, every session.</h3>
              <p className="w-desc">
                Students come to Univeera because they&apos;re serious about their
                future. You&apos;re not selling a service — you&apos;re shaping a
                life decision. Every session matters.
              </p>
              <div className="feature-quote">
                &quot;Univeera lets me focus on the work I actually love —
                guiding students through one of the biggest decisions of their
                lives.&quot;
                <div className="feature-quote-author">
                  <div className="feature-quote-avatar">AS</div>
                  <span>Ahmed S. · Senior Advisor</span>
                </div>
              </div>
            </div>
            <div className="why-card">
              <div className="w-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                </svg>
              </div>
              <h3 className="w-title">A growing MENA platform</h3>
              <p className="w-desc">
                Be part of a region-focused company actively expanding across UAE,
                KSA, Bahrain, Jordan, Qatar, and beyond.
              </p>
            </div>
            <div className="why-card">
              <div className="w-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
                </svg>
              </div>
              <h3 className="w-title">Pre-qualified students</h3>
              <p className="w-desc">
                Students come through our partner schools, fully onboarded with
                profiles, goals, and context already in place.
              </p>
            </div>
            <div className="why-card">
              <div className="w-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
              </div>
              <h3 className="w-title">Run by the platform</h3>
              <p className="w-desc">
                Scheduling, payments, reminders, no-show handling — Univeera takes
                care of it all. You show up to advise.
              </p>
            </div>
            <div className="why-card">
              <div className="w-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              </div>
              <h3 className="w-title">Build your reputation</h3>
              <p className="w-desc">
                Public advisor profile, verified ratings, session history, and
                specialty badges across the platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-label">How it works</div>
            <h2 className="section-title">
              Four steps from <em>application</em> to <em>first session</em>.
            </h2>
            <p className="section-desc">
              Joining Univeera is a curated process. We&apos;re selective about who
              we onboard — students and schools count on the quality of our advisor
              network.
            </p>
          </div>
          <div className="aj-grid">
            {JOURNEY_STEPS.map((step) => (
              <div key={step.num} className="aj-step">
                <div className="aj-num">{step.num}</div>
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
            <div className="section-label">Types of support advisors deliver</div>
            <h2 className="section-title">
              Bring your expertise. <em>Pick your lane.</em>
            </h2>
            <p className="section-desc">
              Univeera advisors work across the full university journey. You choose
              what you specialise in. Students choose you based on what they need.
            </p>
          </div>
          <div className="support-grid">
            {SUPPORT_AREAS.map((area) => (
              <div key={area.title} className="support-card">
                <div className="support-icon">{area.icon}</div>
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
            <div className="section-label">What makes this different</div>
            <h2 className="section-title">
              Not freelance tutoring. <em>A real platform.</em>
            </h2>
            <p className="section-desc">
              Univeera advisors come with context. You&apos;re not advising in a
              vacuum.
            </p>
          </div>
          <div className="diff-grid">
            <div className="diff-content">
              <h3>
                Every student you meet has <em>already done the work</em>.
              </h3>
              <p className="lead">
                Before a student books with you, they&apos;ve completed onboarding,
                taken our Discovery Journey, built a profile, and signaled their
                goals. You start advising with full context — not from a blank page.
              </p>
              <div className="diff-points">
                {DIFF_POINTS.map((point) => (
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
                  <div className="diff-profile-row-label">School</div>
                  <div className="diff-profile-row-val">Partner School · UAE</div>
                </div>
                <div className="diff-profile-row">
                  <div className="diff-profile-row-label">Target countries</div>
                  <div className="diff-profile-row-val">UK · US · Canada</div>
                </div>
                <div className="diff-profile-row">
                  <div className="diff-profile-row-label">Interests</div>
                  <div className="diff-profile-row-val">Engineering · Robotics</div>
                </div>
                <div className="diff-profile-row">
                  <div className="diff-profile-row-label">Predicted grades</div>
                  <div className="diff-profile-row-val">A*AA</div>
                </div>
                <div className="diff-profile-section">
                  <div className="diff-profile-section-label">Top traits</div>
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
                Help shape the next generation of <em>MENA students</em>.
              </h2>
              <p className="cta-desc">
                If you have university admissions expertise — and you care about
                doing this work well — we&apos;d love to talk. Applications take ten
                minutes.
              </p>
              <div className="cta-buttons">
                <Link href="/contact" className="btn btn-cta-primary">
                  Apply as an advisor
                </Link>
                <Link href="/contact" className="btn btn-cta-secondary">
                  Talk to our team
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
