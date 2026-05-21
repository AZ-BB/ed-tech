import Link from "next/link";

import { ForSchoolsNav } from "@/app/for-schools/for-schools-nav";

const FIT_UNIVERSITIES = [
  { logo: "UT", name: "University of Toronto", meta: "Toronto · Canada", score: 95, tier: "s-high" },
  { logo: "IC", name: "Imperial College London", meta: "London · UK", score: 91, tier: "s-high" },
  { logo: "UM", name: "University of Michigan", meta: "Ann Arbor · US", score: 88, tier: "s-high" },
  { logo: "AU", name: "American Univ. of Sharjah", meta: "Sharjah · UAE", score: 82, tier: "s-mid" },
  { logo: "KU", name: "Khalifa University", meta: "Abu Dhabi · UAE", score: 79, tier: "s-mid" },
  { logo: "MM", name: "McMaster University", meta: "Hamilton · Canada", score: 76, tier: "s-mid" },
  { logo: "QU", name: "Qatar University", meta: "Doha · Qatar", score: 71, tier: "s-low" },
] as const;

const JOURNEY_STEPS = [
  { num: 1, title: "School joins", desc: "Sign a simple agreement. We configure your school portal." },
  { num: 2, title: "Students gain access", desc: "Bulk-invite students. They onboard in under three minutes." },
  { num: 3, title: "Discovery & exploration", desc: "Students complete the journey and explore options." },
  { num: 4, title: "Counsellors support", desc: "Counsellors monitor progress and intervene as needed." },
  { num: 5, title: "Reports & outcomes", desc: "Monthly reporting gives leadership a full view." },
] as const;

const COUNSELLOR_POINTS = [
  "A single dashboard showing every student's stage and next step",
  "Automated reminders for deadlines, applications, and check-ins",
  "Built-in essay queue, advisor scheduling, and ambassador access",
  "Notes and progress logs stay with each student profile",
  "No more spreadsheets, no more lost context",
] as const;

const LEADERSHIP_POINTS = [
  "Cohort-level engagement, completion, and outcome metrics",
  "Application and acceptance tracking across destinations",
  "University and scholarship coverage benchmarked against peers",
  "Brandable reports for board meetings and parent comms",
  "Year-on-year trend visibility",
] as const;

const DESTINATIONS = [
  { flag: "🇬🇧", name: "United Kingdom", count: 52 },
  { flag: "🇺🇸", name: "United States", count: 38 },
  { flag: "🇨🇦", name: "Canada", count: 21 },
  { flag: "🇦🇪", name: "UAE", count: 12 },
  { flag: "🇦🇺", name: "Australia", count: 5 },
] as const;

const PROGRAMMES = [
  { name: "Business & Finance", count: 34, width: "85%" },
  { name: "Engineering", count: 26, width: "65%" },
  { name: "Medicine", count: 22, width: "55%" },
  { name: "Computer Science", count: 18, width: "45%" },
  { name: "Creative & Design", count: 12, width: "30%" },
] as const;

const POST_ADMISSION_CHIPS = [
  {
    label: "Visa support",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    label: "Accommodation",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: "Tuition payment",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    label: "Health insurance",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    label: "Flight booking",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
      </svg>
    ),
  },
  {
    label: "See all",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    ),
  },
] as const;

export default function ForSchoolsPage() {
  return (
    <>
      <ForSchoolsNav />

      <section className="hero">
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              For schools and counsellors
            </div>
            <h1>
              Run modern university guidance, <em>at scale</em>.
            </h1>
            <p className="hero-sub">
              Give your students the structured, data-informed university journey they deserve, and give your
              counsellors the visibility, tools, and reporting they need to support every student well.
            </p>
            <div className="hero-ctas">
              <Link href="/contact" className="btn btn-primary">
                Book a demo
              </Link>
              <Link href="#unlock" className="btn btn-secondary">
                See what&apos;s included
              </Link>
            </div>
          </div>
          <div className="hero-right">
            <div className="fs-hero-visual">
              <div className="fs-card main">
                <div className="fs-card-header">
                  <div className="fs-card-title">Counsellor overview</div>
                  <div className="fs-badge">Live</div>
                </div>
                <div className="fs-kpi-row">
                  <div className="fs-kpi">
                    <div className="fs-kpi-label">Onboarded</div>
                    <div className="fs-kpi-val">128</div>
                    <div className="fs-kpi-delta">↑ 12% MoM</div>
                  </div>
                  <div className="fs-kpi">
                    <div className="fs-kpi-label">Discovery</div>
                    <div className="fs-kpi-val">74%</div>
                    <div className="fs-kpi-delta">↑ 8% MoM</div>
                  </div>
                  <div className="fs-kpi">
                    <div className="fs-kpi-label">Sessions</div>
                    <div className="fs-kpi-val">18</div>
                    <div className="fs-kpi-delta">↑ 5 wk</div>
                  </div>
                </div>
              </div>
              <div className="fs-card students">
                <div className="fs-students-title">
                  Students in progress <small>view all</small>
                </div>
                <div className="fs-student-row">
                  <div className="fs-avatar">SH</div>
                  <div className="fs-student-info">
                    <div className="fs-student-name">Sara H.</div>
                    <div className="fs-student-stage">Applications · Y13</div>
                  </div>
                  <div className="fs-progress p95" />
                </div>
                <div className="fs-student-row">
                  <div className="fs-avatar">OK</div>
                  <div className="fs-student-info">
                    <div className="fs-student-name">Omar K.</div>
                    <div className="fs-student-stage">Discovery · Y12</div>
                  </div>
                  <div className="fs-progress p65" />
                </div>
                <div className="fs-student-row">
                  <div className="fs-avatar">LA</div>
                  <div className="fs-student-info">
                    <div className="fs-student-name">Layla A.</div>
                    <div className="fs-student-stage">Essays · Y13</div>
                  </div>
                  <div className="fs-progress p80" />
                </div>
                <div className="fs-student-row">
                  <div className="fs-avatar">YR</div>
                  <div className="fs-student-info">
                    <div className="fs-student-name">Yusuf R.</div>
                    <div className="fs-student-stage">Exploration · Y12</div>
                  </div>
                  <div className="fs-progress p40" />
                </div>
              </div>
              <div className="fs-card activity">
                <div className="fs-activity-title">Recent activity</div>
                <div className="fs-activity-row">
                  <div className="fs-activity-dot" />
                  <div>
                    <div className="fs-activity-text">
                      <b>Sara H.</b> submitted an essay
                    </div>
                    <div className="fs-activity-time">14 min ago</div>
                  </div>
                </div>
                <div className="fs-activity-row">
                  <div className="fs-activity-dot b" />
                  <div>
                    <div className="fs-activity-text">
                      <b>Omar K.</b> booked a session
                    </div>
                    <div className="fs-activity-time">1 hour ago</div>
                  </div>
                </div>
                <div className="fs-activity-row">
                  <div className="fs-activity-dot" />
                  <div>
                    <div className="fs-activity-text">
                      <b>Layla A.</b> shortlisted 3 unis
                    </div>
                    <div className="fs-activity-time">Today</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-light" id="unlock">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-label">What schools unlock</div>
            <h2 className="section-title section-title-full">
              An end-to-end guidance platform, <em>under one roof</em>.
            </h2>
            <p className="section-desc section-desc-full">
              A complete system covering every part of the university journey — from self-discovery, to
              application, to landing in the destination country. Built for MENA schools, MENA students, MENA
              families.
            </p>
          </div>

          <div className="bento bento-clean">
            <div className="bento-card hero-card">
              <div className="hc-top">
                <div className="b-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <line x1="12" y1="20" x2="12" y2="10" />
                    <line x1="18" y1="20" x2="18" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="16" />
                  </svg>
                </div>
                <h3 className="b-title">Counsellor command centre</h3>
                <p className="b-desc">
                  A real-time dashboard showing every student&apos;s stage, progress, and next step. No more chasing
                  updates. Every counsellor sees exactly where each student is — and where to intervene.
                </p>
              </div>

              <div className="hc-activity">
                <div className="hc-activity-head">
                  <span>Recent activity</span>
                  <span className="hc-activity-live">
                    <span className="hc-live-dot" />
                    Live
                  </span>
                </div>
                <div className="hc-activity-row">
                  <div className="hc-avatar">SH</div>
                  <div className="hc-activity-text">
                    <b>Sara H.</b> submitted essay for review
                  </div>
                  <span className="hc-activity-time">14m</span>
                </div>
                <div className="hc-activity-row">
                  <div className="hc-avatar v2">OK</div>
                  <div className="hc-activity-text">
                    <b>Omar K.</b> booked advisor session
                  </div>
                  <span className="hc-activity-time">1h</span>
                </div>
                <div className="hc-activity-row">
                  <div className="hc-avatar v3">LA</div>
                  <div className="hc-activity-text">
                    <b>Layla A.</b> shortlisted 3 universities
                  </div>
                  <span className="hc-activity-time">2h</span>
                </div>
                <div className="hc-activity-row">
                  <div className="hc-avatar v4">YR</div>
                  <div className="hc-activity-text">
                    <b>Yusuf R.</b> completed Discovery Journey
                  </div>
                  <span className="hc-activity-time">3h</span>
                </div>
              </div>

              <div className="hc-stage-bar">
                <div className="hc-stage-bar-label">
                  <span>Where your students are right now</span>
                  <span className="hc-stage-bar-total">128 students</span>
                </div>
                <div className="hc-stage-track">
                  <div className="hc-stage-seg s1" style={{ width: "18%" }} />
                  <div className="hc-stage-seg s2" style={{ width: "32%" }} />
                  <div className="hc-stage-seg s3" style={{ width: "28%" }} />
                  <div className="hc-stage-seg s4" style={{ width: "22%" }} />
                </div>
                <div className="hc-stage-legend">
                  <div className="hc-stage-li">
                    <span className="hc-stage-dot s1" />
                    <span>Discovery</span>
                    <b>23</b>
                  </div>
                  <div className="hc-stage-li">
                    <span className="hc-stage-dot s2" />
                    <span>Exploring</span>
                    <b>41</b>
                  </div>
                  <div className="hc-stage-li">
                    <span className="hc-stage-dot s3" />
                    <span>Applications</span>
                    <b>36</b>
                  </div>
                  <div className="hc-stage-li">
                    <span className="hc-stage-dot s4" />
                    <span>Admitted</span>
                    <b>28</b>
                  </div>
                </div>
              </div>
            </div>

            <div className="bento-card fit-card">
              <div className="fc-top">
                <div className="b-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                    <path d="M19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7L19 17z" />
                  </svg>
                </div>
                <h3 className="b-title">AI-powered university matching</h3>
                <p className="b-desc">
                  Students don&apos;t get a list of 1,100 universities. They get a personalised shortlist — each match
                  scored against their profile, goals, and academics. With the reasoning behind every score.
                </p>
              </div>
              <div className="fc-example">
                {FIT_UNIVERSITIES.map((uni) => (
                  <div key={uni.logo} className="fc-row">
                    <div className="fc-uni">
                      <div className="fc-uni-logo">{uni.logo}</div>
                      <div>
                        <div className="fc-uni-name">{uni.name}</div>
                        <div className="fc-uni-meta">{uni.meta}</div>
                      </div>
                    </div>
                    <div className={`fc-score ${uni.tier}`}>{uni.score}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bento-card uniform">
              <div className="b-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 19l7-7 3 3-7 7-3-3z" />
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                </svg>
              </div>
              <h3 className="b-title">Essay review</h3>
              <p className="b-desc">
                AI feedback on first drafts. Human advisor review on final versions. No personal statement leaves
                Univeera unrefined.
              </p>
            </div>

            <div className="bento-card uniform">
              <div className="b-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <h3 className="b-title">1-on-1 advisor sessions</h3>
              <p className="b-desc">
                Vetted university advisors bookable in-platform. Every student gets one free intro session. Premium
                packages available when they need more.
              </p>
            </div>

            <div className="bento-card uniform">
              <div className="b-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
                </svg>
              </div>
              <h3 className="b-title">Ambassador network</h3>
              <p className="b-desc">
                Real students currently at target universities, ready to answer the honest questions your students
                wouldn&apos;t ask anywhere else.
              </p>
            </div>

            <div className="bento-card uniform">
              <div className="b-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </div>
              <h3 className="b-title">Application support</h3>
              <p className="b-desc">
                Application timelines, requirements checklists, deadline reminders, submission tracking — built
                directly into every student journey.
              </p>
            </div>

            <div className="bento-card uniform">
              <div className="b-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                </svg>
              </div>
              <h3 className="b-title">Discovery Journey</h3>
              <p className="b-desc">
                A psychometric assessment that helps each student understand who they are — and what kinds of paths
                actually fit them — before they pick a university.
              </p>
            </div>

            <div className="bento-card uniform">
              <div className="b-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M16 8h-6a2 2 0 100 4h4a2 2 0 110 4H8" />
                  <line x1="12" y1="6" x2="12" y2="18" />
                </svg>
              </div>
              <h3 className="b-title">Scholarship matching</h3>
              <p className="b-desc">
                A curated database of MENA-eligible scholarships. Filtered to what each student can actually win —
                not US-citizen-only awards.
              </p>
            </div>

            <div className="bento-card differentiator-dark">
              <div className="diff-flex">
                <div className="diff-left">
                  <div className="b-badge-dark">
                    <span className="b-badge-star">★</span> Exclusive to Univeera
                  </div>
                  <h3 className="b-title-lg-light">
                    Beyond admission. <em>All the way to landing.</em>
                  </h3>
                  <p className="b-desc-lg-light">
                    Most platforms stop at &quot;you got in.&quot; Univeera doesn&apos;t. We support students through
                    everything that happens after the acceptance letter — the part that families actually need help
                    with.
                  </p>
                </div>
                <div className="diff-right">
                  {POST_ADMISSION_CHIPS.map((chip) => (
                    <Link key={chip.label} href="/contact" className="diff-chip-dark">
                      <span className="diff-chip-icon-dark">{chip.icon}</span>
                      <span className="diff-chip-label-dark">{chip.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="bento-card uniform">
              <div className="b-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </div>
              <h3 className="b-title">Webinars &amp; live events</h3>
              <p className="b-desc">
                Regular sessions with admissions officers, alumni, and subject experts. Recordings stay in your
                school&apos;s library for any student who misses the live event.
              </p>
            </div>

            <div className="bento-card uniform">
              <div className="b-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <h3 className="b-title">Bulk onboarding &amp; portal</h3>
              <p className="b-desc">
                Invite an entire cohort in one click. Counsellor accounts. Permission tiers. School portal for admins
                and leadership.
              </p>
            </div>

            <div className="bento-card uniform">
              <div className="b-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              </div>
              <h3 className="b-title">Monthly school reports</h3>
              <p className="b-desc">
                Cohort-level engagement, completion, and outcome data. Brandable for board meetings and parent
                communications. Year-on-year trends.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-label">How it works</div>
            <h2 className="section-title">
              Five steps from <em>signed up</em> to <em>fully running</em>.
            </h2>
            <p className="section-desc">
              We&apos;ve designed onboarding to require almost nothing from your team. Most schools are fully
              operational within two weeks.
            </p>
          </div>
          <div className="journey-wrap">
            <div className="journey-line" />
            <div className="journey">
              {JOURNEY_STEPS.map((step) => (
                <div key={step.num} className="j-step">
                  <div className="j-num">{step.num}</div>
                  <div className="j-title">{step.title}</div>
                  <div className="j-desc">{step.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section section-light">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-label">Built for the whole school</div>
            <h2 className="section-title section-title-full">
              A platform that works for <em>counsellors</em> and <em>leadership</em>.
            </h2>
            <p className="section-desc section-desc-full">
              Different people in your school need different things from a guidance platform. Univeera serves both.
            </p>
          </div>
          <div className="split">
            <div className="split-card">
              <div className="s-label">For counsellors</div>
              <h3 className="s-title">Less admin. More guidance.</h3>
              <p className="s-desc">
                Univeera handles the tracking, reminders, and routine workflows. Your counsellors focus on the
                conversations that actually shape student futures.
              </p>
              <ul className="s-list">
                {COUNSELLOR_POINTS.map((point) => (
                  <li key={point} className="s-li">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div className="split-card dark">
              <div className="s-label">For school leadership</div>
              <h3 className="s-title">Outcomes you can measure.</h3>
              <p className="s-desc">
                Monthly reports show parents and boards how your guidance programme is performing — and where your
                team is making real impact.
              </p>
              <ul className="s-list">
                {LEADERSHIP_POINTS.map((point) => (
                  <li key={point} className="s-li">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-label">Platform in practice</div>
            <h2 className="section-title">
              What a typical school sees <em>each month</em>.
            </h2>
            <p className="section-desc">
              A snapshot from a partner school&apos;s reporting dashboard. Real activity drives real conversations.
            </p>
          </div>
          <div className="stats-scene">
            <div className="stats-scene-eyebrow">
              <div className="stats-school-name">
                <div className="stats-school-logo">U</div>
                <span>Partner school · October report</span>
              </div>
              <div className="stats-period">Updated 2 hours ago</div>
            </div>
            <div className="stats-grid">
              <div className="stat-tile">
                <div className="stat-tile-label">Students onboarded</div>
                <div className="stat-tile-num">128</div>
                <div className="stat-tile-delta">↑ 12% MoM</div>
              </div>
              <div className="stat-tile">
                <div className="stat-tile-label">Discovery completed</div>
                <div className="stat-tile-num">74%</div>
                <div className="stat-tile-delta">↑ 8% MoM</div>
              </div>
              <div className="stat-tile">
                <div className="stat-tile-label">Essays submitted</div>
                <div className="stat-tile-num">42</div>
                <div className="stat-tile-delta">↑ 22% MoM</div>
              </div>
              <div className="stat-tile">
                <div className="stat-tile-label">Advisor sessions</div>
                <div className="stat-tile-num">18</div>
                <div className="stat-tile-delta">↑ 35% MoM</div>
              </div>
            </div>
            <div className="stats-detail">
              <div>
                <div className="stats-block-title">Top destinations</div>
                {DESTINATIONS.map((dest) => (
                  <div key={dest.name} className="dest-row">
                    <div className="dest-name">
                      <span className="dest-flag">{dest.flag}</span> {dest.name}
                    </div>
                    <div className="dest-count">{dest.count}</div>
                  </div>
                ))}
              </div>
              <div>
                <div className="stats-block-title">Top programmes</div>
                {PROGRAMMES.map((prog) => (
                  <div key={prog.name} className="bar-row">
                    <div className="bar-row-label">
                      <span>{prog.name}</span>
                      <span>{prog.count}</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: prog.width }} />
                    </div>
                  </div>
                ))}
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
                Bring modern university guidance to <em>your school</em>.
              </h2>
              <p className="cta-desc">
                A 30-minute demo walks your team through the dashboard, student experience, and reporting. We tailor
                every demo to your school&apos;s context.
              </p>
              <div className="cta-buttons">
                <Link href="/contact" className="btn btn-cta-primary">
                  Book a demo
                </Link>
                <a href="mailto:admin@univeera.me" className="btn btn-cta-secondary">
                  Email our schools team
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
