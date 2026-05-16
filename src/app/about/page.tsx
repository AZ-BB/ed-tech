import Link from "next/link";

import { AboutNav } from "@/app/about/about-nav";

const ADVISORS = [
  { id: 1, name: "James T." },
  { id: 2, name: "Ahmed M." },
  { id: 3, name: "Rana J." },
  { id: 4, name: "Nadia H." },
  { id: 5, name: "Sarah K." },
  { id: 6, name: "Omar B." },
] as const;

const COUNTRIES = [
  { flag: "🇦🇪", name: "UAE", status: "Active" },
  { flag: "🇸🇦", name: "Saudi Arabia", status: "Active" },
  { flag: "🇧🇭", name: "Bahrain", status: "Active" },
  { flag: "🇶🇦", name: "Qatar", status: "Active" },
  { flag: "🇰🇼", name: "Kuwait", status: "Active" },
  { flag: "🇯🇴", name: "Jordan", status: "Active" },
  { flag: "🇴🇲", name: "Oman", status: "Expanding" },
  { flag: "🇪🇬", name: "Egypt", status: "Expanding" },
] as const;

export default function AboutPage() {
  return (
    <>
      <AboutNav />

      <section className="hero about-hero">
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              About Univeera
            </div>
            <h1>
              From <em>confusion</em>, to <em>clarity</em>, to{" "}
              <em>confidence</em>.
            </h1>
            <p className="hero-sub">
              Univeera is a MENA-focused platform built to help students make
              the most important decision of their early lives — what to study,
              where, and why — with the structure, tools, and human guidance
              they deserve.
            </p>

            <div className="hero-journey">
              <div className="hj-row">
                <div className="hj-step start">
                  <div className="hj-dot">
                    <svg
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
                    </svg>
                  </div>
                  <div className="hj-label">Confusion</div>
                  <div className="hj-sub">where most start</div>
                </div>
                <div className="hj-step">
                  <div className="hj-dot">
                    <svg
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
                    </svg>
                  </div>
                  <div className="hj-label">Discovery</div>
                  <div className="hj-sub">find your fit</div>
                </div>
                <div className="hj-step">
                  <div className="hj-dot">
                    <svg
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
                    </svg>
                  </div>
                  <div className="hj-label">Exploration</div>
                  <div className="hj-sub">build options</div>
                </div>
                <div className="hj-step end">
                  <div className="hj-dot">
                    <svg
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
                    </svg>
                  </div>
                  <div className="hj-label">Clarity</div>
                  <div className="hj-sub">where we get you</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-light advisors-section">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-label">Our advisory board</div>
            <h2 className="section-title">
              Backed by <em>world-class advisors</em> and educators.
            </h2>
            <p className="section-desc">
              Univeera is shaped by a growing network of senior admissions
              officers, school leaders, and global ed-tech operators who&apos;ve
              spent careers thinking about how students choose where to study —
              and how the system can be better. A few of them, below.
            </p>
          </div>

          <div className="advisors-grid">
            {ADVISORS.map((advisor) => (
              <div key={advisor.id} className="advisor-card">
                <div className="advisor-avatar-wrap">
                  <div className={`advisor-avatar av-${advisor.id}`} />
                </div>
                <div className="advisor-name">{advisor.name}</div>
              </div>
            ))}
            <div className="advisor-card advisor-more">
              <div className="advisor-avatar-wrap">
                <div className="advisor-avatar advisor-more-circle">
                  <span className="advisor-more-text">+ more</span>
                </div>
              </div>
              <div className="advisor-name">And growing</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mission-quote-section">
        <div className="mission-quote">
          We believe every student deserves to make their next big decision with{" "}
          <em>clarity</em>, not <em>confusion</em>.
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-label">The problem we&apos;re solving</div>
            <h2 className="section-title">
              University guidance is <em>broken</em> in our region.
            </h2>
            <p className="section-desc">
              Students across MENA make life-changing decisions about university
              with too little structure, too much noise, and not enough support.
              We&apos;re here to fix that.
            </p>
          </div>
          <div className="problem-grid">
            <div className="problem-card">
              <div className="problem-icon">
                <svg
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
                </svg>
              </div>
              <h4>Too much information</h4>
              <p>
                Thousands of universities. Endless rankings. Conflicting advice.
                Students drown in data before they make a single decision.
              </p>
            </div>
            <div className="problem-card">
              <div className="problem-icon">
                <svg
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
                </svg>
              </div>
              <h4>Too little direction</h4>
              <p>
                Knowing what to study, where, and why is harder than ever. Most
                students aren&apos;t given the tools or frameworks to figure it
                out.
              </p>
            </div>
            <div className="problem-card">
              <div className="problem-icon">
                <svg
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
                </svg>
              </div>
              <h4>Fragmented support</h4>
              <p>
                School counsellors are overstretched. Family advice is dated.
                Advisors are expensive or hard to access. Nothing connects.
              </p>
            </div>
            <div className="problem-card">
              <div className="problem-icon">
                <svg
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
                </svg>
              </div>
              <h4>Overwhelming decisions</h4>
              <p>
                Students end up making consequential choices on partial
                information, family pressure, or whichever Instagram ad showed up
                most.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-light">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-label">What we believe</div>
            <h2 className="section-title">
              Four ideas that shape <em>everything we build</em>.
            </h2>
            <p className="section-desc">
              These aren&apos;t slogans — they&apos;re the principles we test
              every product decision against.
            </p>
          </div>
          <div className="beliefs">
            <div className="belief-card">
              <div className="belief-num">01</div>
              <h3 className="belief-title">
                Every student deserves <em>clarity</em>.
              </h3>
              <p className="belief-desc">
                Not faster results. Not more options. Clarity. The path from
                where you are to where you want to be should feel walkable, not
                impossible.
              </p>
            </div>
            <div className="belief-card">
              <div className="belief-num">02</div>
              <h3 className="belief-title">
                Guidance must be <em>personalised</em>.
              </h3>
              <p className="belief-desc">
                One ranked list doesn&apos;t fit one thousand students. Real
                guidance starts from understanding who the student is — and meets
                them there.
              </p>
            </div>
            <div className="belief-card">
              <div className="belief-num">03</div>
              <h3 className="belief-title">
                Technology supports <em>human judgement</em>.
              </h3>
              <p className="belief-desc">
                Software handles data, tracking, routine. People handle
                conversations, nuance, encouragement. Both matter.
              </p>
            </div>
            <div className="belief-card">
              <div className="belief-num">04</div>
              <h3 className="belief-title">
                Opportunity should be <em>accessible</em>.
              </h3>
              <p className="belief-desc">
                A student in Cairo, Manama, or Riyadh should have access to the
                same quality of guidance as a student in London or Boston.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-label">How the platform helps</div>
            <h2 className="section-title">
              From <em>where you are</em> to <em>where you&apos;re going</em>,
              step by step.
            </h2>
            <p className="section-desc">
              Univeera isn&apos;t a search engine. It&apos;s a structured journey
              — designed so students never feel lost about what to do next.
            </p>
          </div>
          <div className="staircase">
            <div className="stair-step">
              <div className="stair-num">01</div>
              <div className="stair-content">
                <h4>Discover yourself</h4>
                <p>
                  A six-module psychometric Discovery Journey reveals who you are,
                  how you think, and what kind of paths will fit.
                </p>
              </div>
            </div>
            <div className="stair-step">
              <div className="stair-num">02</div>
              <div className="stair-content">
                <h4>Explore options</h4>
                <p>
                  Search 1,100+ universities, hundreds of scholarships, and
                  dozens of programmes — filtered by what&apos;s actually right
                  for you.
                </p>
              </div>
            </div>
            <div className="stair-step">
              <div className="stair-num">03</div>
              <div className="stair-content">
                <h4>Get guidance</h4>
                <p>
                  Talk to vetted advisors and current university ambassadors.
                  Real conversations with people who&apos;ve been where
                  you&apos;re going.
                </p>
              </div>
            </div>
            <div className="stair-step">
              <div className="stair-num">04</div>
              <div className="stair-content">
                <h4>Take action</h4>
                <p>
                  Build application timelines, refine essays with AI and human
                  review, and submit with full clarity about why.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-light">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-label">Mission and vision</div>
            <h2 className="section-title">
              Where we are. <em>Where we&apos;re going.</em>
            </h2>
            <p className="section-desc">
              Univeera was built with a specific belief about what students need
              — and a long-term view of what we&apos;re building toward.
            </p>
          </div>
          <div className="mv-grid">
            <div className="mv-card">
              <div className="mv-label">Our mission</div>
              <h3 className="mv-title">
                Help every MENA student make the <em>right next decision</em>.
              </h3>
              <p className="mv-text">
                We exist to give students, families, schools, and advisors a
                single platform where the entire university journey makes sense.
                Where the right tools, the right people, and the right information
                meet at the right time.
              </p>
            </div>
            <div className="mv-card dark">
              <div className="mv-label">Our vision</div>
              <h3 className="mv-title">
                A region where every student has access to{" "}
                <em>world-class guidance</em>.
              </h3>
              <p className="mv-text">
                We see a future where studying abroad isn&apos;t a privilege of
                geography or connection — where any MENA student with ambition
                has the structure, mentors, and support to compete globally.
                We&apos;re building toward that future, one school and one student
                at a time.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="region-section">
        <div className="region-inner">
          <div className="region-grid">
            <div className="region-content">
              <div className="section-label">Built for the region</div>
              <h2>
                MENA-focused. <em>From day one.</em>
              </h2>
              <p>
                Univeera is not a Western platform translated into Arabic.
                It&apos;s built from the ground up around how university
                decisions actually happen in our region — including the family
                dynamics, scholarship landscapes, and school systems that
                don&apos;t fit anywhere else.
              </p>
              <p>
                That means scholarships accessible to MENA students.
                Universities that admit MENA students. Advisors who understand the
                region. Counsellors who know the curricula.
              </p>
              <ul className="region-list">
                <li className="region-li">
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
                  <span>
                    We know British, American, IB, French, and national curricula
                    across the region.
                  </span>
                </li>
                <li className="region-li">
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
                  <span>
                    Our scholarship database is curated for MENA eligibility —
                    not US-citizen-only awards.
                  </span>
                </li>
                <li className="region-li">
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
                  <span>
                    Our advisor network includes people who studied, worked, and
                    live in the region.
                  </span>
                </li>
                <li className="region-li">
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
                  <span>
                    Our content reflects MENA family contexts, expectations, and
                    decision dynamics.
                  </span>
                </li>
              </ul>
            </div>
            <div className="region-visual">
              <div className="region-title">Where we operate</div>
              <div className="region-subtitle">
                Active in 8 MENA countries · expanding
              </div>
              <div className="country-grid">
                {COUNTRIES.map((country) => (
                  <div key={country.name} className="country-row">
                    <div className="country-row-name">
                      <span className="country-flag">{country.flag}</span>
                      {country.name}
                    </div>
                    <div className="country-status">{country.status}</div>
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
                Build the future of <em>MENA university guidance</em> with us.
              </h2>
              <p className="cta-desc">
                Whether you&apos;re a school, an advisor, a parent, or a student
                — there&apos;s a place for you on this platform.
              </p>
              <div className="cta-buttons">
                <Link href="/contact" className="btn btn-cta-primary">
                  Get in touch
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
