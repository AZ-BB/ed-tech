import Link from "next/link";

import {
  MarketingSubpageFooter,
  MarketingSubpageNav,
} from "@/components/landing/marketing-subpage-chrome";

function ArrowRight() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden
    >
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

function CheckTiny() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#2D6A4F"
      strokeWidth="3"
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export default function ForAdvisorsPage() {
  return (
    <>
      <MarketingSubpageNav />

      <div className="hero">
        <h1 className="font-bold">Grow your advisory impact with Univeera</h1>
        <p>
          Connect with students actively seeking guidance, offer 1:1 sessions,
          and build your presence as a trusted advisor — all in one platform.
        </p>
        <Link className="btn" href="/contact">
          Join as an advisor <ArrowRight />
        </Link>
      </div>

      <div className="section">
        <div className="section-label">What you get as an advisor</div>
        <div className="section-title">Real tools. Real students. Real growth.</div>
        <div className="section-sub">
          Univeera gives you everything you need to build your advisory practice
          and reach more students.
        </div>

        <div className="benefit-grid">
          <div className="benefit-card">
            <div className="benefit-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2D6A4F"
                strokeWidth="1.8"
                aria-hidden
              >
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <h3>Access to students</h3>
            <p>
              Get matched with students who are actively looking for guidance on
              university applications, essays, and career decisions.
            </p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2D6A4F"
                strokeWidth="1.8"
                aria-hidden
              >
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h3>Profile visibility</h3>
            <p>
              Build a public advisor profile that showcases your experience,
              specialisations, and track record — making you discoverable to
              students and families.
            </p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2D6A4F"
                strokeWidth="1.8"
                aria-hidden
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h3>Session management</h3>
            <p>
              Offer, schedule, and manage 1:1 sessions through the platform. No
              back-and-forth. Students book directly from your profile.
            </p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2D6A4F"
                strokeWidth="1.8"
                aria-hidden
              >
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <path d="M22 4L12 14.01l-3-3" />
              </svg>
            </div>
            <h3>Credibility building</h3>
            <p>
              Be positioned as a trusted, verified advisor on the platform.
              Collect reviews, showcase results, and build a reputation that
              compounds over time.
            </p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2D6A4F"
                strokeWidth="1.8"
                aria-hidden
              >
                <path d="M18 20V10" />
                <path d="M12 20V4" />
                <path d="M6 20v-6" />
              </svg>
            </div>
            <h3>Scalable reach</h3>
            <p>
              Support more students without relying on referrals or manual
              outreach. The platform brings students to you based on what they
              need.
            </p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2D6A4F"
                strokeWidth="1.8"
                aria-hidden
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
              </svg>
            </div>
            <h3>Regional focus</h3>
            <p>
              Work with students across the Middle East who are applying to
              universities in the US, UK, Canada, Europe, and beyond.
            </p>
          </div>
        </div>
      </div>

      <div className="steps-section">
        <div className="section" style={{ paddingBottom: 60 }}>
          <div className="section-label">How it works</div>
          <div className="section-title">Three steps to get started</div>
          <div className="section-sub">
            It takes less than 10 minutes to set up. Start connecting with
            students right away.
          </div>

          <div className="steps-row">
            <div className="step">
              <div className="step-line" />
              <div className="step-num">1</div>
              <h3>Create your profile</h3>
              <p>
                Add your background, expertise, and the areas you advise on. Set
                your availability and session format.
              </p>
            </div>
            <div className="step">
              <div className="step-line" />
              <div className="step-num">2</div>
              <h3>Get matched with students</h3>
              <p>
                Students discover you based on their needs — university
                destination, major, or application stage.
              </p>
            </div>
            <div className="step">
              <div className="step-line" />
              <div className="step-num">3</div>
              <h3>Start advising</h3>
              <p>
                Run 1:1 sessions, support essays and applications, and build
                lasting relationships with students.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-label">What advisors do on the platform</div>
        <div className="section-title">Monetise your expertise. Multiply your impact.</div>
        <div className="section-sub">
          Whether you&apos;re an independent counsellor or part of a team, the
          platform works around how you advise.
        </div>

        <div className="action-grid">
          <div className="action-card">
            <div className="action-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2D6A4F"
                strokeWidth="1.8"
                aria-hidden
              >
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path d="M19 10v2a7 7 0 01-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
            <div>
              <h3>Run paid 1:1 sessions</h3>
              <p>
                Set your own rates and session structure. Students book directly
                through your profile — no middlemen, no chasing payments.
              </p>
            </div>
          </div>
          <div className="action-card">
            <div className="action-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2D6A4F"
                strokeWidth="1.8"
                aria-hidden
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <div>
              <h3>Review essays and applications</h3>
              <p>
                Help students strengthen their personal statements and
                applications using the platform&apos;s essay tools alongside your
                expertise.
              </p>
            </div>
          </div>
          <div className="action-card">
            <div className="action-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2D6A4F"
                strokeWidth="1.8"
                aria-hidden
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <div>
              <h3>Guide university selection</h3>
              <p>
                Use the platform&apos;s university database and AI matching to
                support students in finding the right-fit institutions for their
                goals.
              </p>
            </div>
          </div>
          <div className="action-card">
            <div className="action-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2D6A4F"
                strokeWidth="1.8"
                aria-hidden
              >
                <path d="M12 2l3 6.5L22 9l-5 4.9L18.2 21 12 17.3 5.8 21 7 13.9 2 9l7-0.5z" />
              </svg>
            </div>
            <div>
              <h3>Build your reputation</h3>
              <p>
                Collect student reviews, showcase success stories, and grow a
                track record that makes you the obvious choice for families
                seeking guidance.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="section" style={{ paddingTop: 20, paddingBottom: 60 }}>
        <div className="section-label">Why this matters</div>
        <div className="section-title">More than advising. A career advantage.</div>
        <div className="section-sub">
          The best advisors don&apos;t just wait for referrals. They build systems
          that bring students to them.
        </div>

        <div className="why-grid">
          <div className="why-item">
            <div className="why-check">
              <CheckTiny />
            </div>
            <p>
              Help students make better, more confident university decisions
            </p>
          </div>
          <div className="why-item">
            <div className="why-check">
              <CheckTiny />
            </div>
            <p>
              Provide real guidance at the most critical stage of their journey
            </p>
          </div>
          <div className="why-item">
            <div className="why-check">
              <CheckTiny />
            </div>
            <p>Scale your impact across more students without more manual work</p>
          </div>
          <div className="why-item">
            <div className="why-check">
              <CheckTiny />
            </div>
            <p>
              Be part of a trusted advisory ecosystem built for the MENA region
            </p>
          </div>
        </div>
      </div>

      <div className="trust-section">
        <div className="trust-row">
          <div className="trust-item">
            <div className="trust-dot" />
            Supporting students across the Middle East
          </div>
          <div className="trust-item">
            <div className="trust-dot" />
            Focused on international university pathways
          </div>
          <div className="trust-item">
            <div className="trust-dot" />
            Combining AI tools with human expertise
          </div>
        </div>
      </div>

      <div className="cta-section">
        <div className="cta-card">
          <h2 className="font-bold">Start supporting students today</h2>
          <p>
            Join Univeera and connect with students who are actively looking for
            guidance.
          </p>
          <Link className="btn" href="/contact">
            Join as an advisor <ArrowRight />
          </Link>
        </div>
      </div>

      <MarketingSubpageFooter />
    </>
  );
}
