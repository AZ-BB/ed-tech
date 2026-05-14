import Link from "next/link";

import { MarketingSubpageNav } from "@/components/landing/marketing-subpage-chrome";
import { LandingFooter } from "@/components/landing/landing-footer";

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

export default function ForSchoolsPage() {
  return (
    <>
      <MarketingSubpageNav />

      <div className="hero">
        <h1 className="font-bold">Partner with Univeera</h1>
        <p>
          Give your students access to university discovery, scholarships,
          application support, and real guidance — while giving your school full
          visibility into their journey.
        </p>
        <Link className="btn" href="/contact">
          Partner with us <ArrowRight />
        </Link>
      </div>

      <div className="section">
        <div className="section-label">What your school gets</div>
        <div className="section-title">Full visibility. Real control.</div>
        <div className="section-sub">
          Everything your counselling team needs to support students, track
          progress, and improve outcomes — in one place.
        </div>

        <div className="dash-grid">
          <div className="dash-card">
            <div className="dash-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2D6A4F"
                strokeWidth="1.8"
                aria-hidden
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <h3>School dashboard</h3>
            <p>
              A centralised dashboard where your team can see student activity,
              application progress, and platform usage at a glance.
            </p>
          </div>
          <div className="dash-card">
            <div className="dash-icon">
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
            <h3>Counsellor accounts</h3>
            <p>
              Multiple logins for your counselling team. Each counsellor can
              manage their own student groups and track individual journeys.
            </p>
          </div>
          <div className="dash-card">
            <div className="dash-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2D6A4F"
                strokeWidth="1.8"
                aria-hidden
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <h3>Student tracking</h3>
            <p>
              See which universities your students are exploring, which
              scholarships they&apos;ve saved, and where they are in the
              application process.
            </p>
          </div>
          <div className="dash-card">
            <div className="dash-icon">
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
            <h3>Engagement insights</h3>
            <p>
              Track time spent on the platform, features used, essays submitted,
              advisor sessions booked, and more — per student or school-wide.
            </p>
          </div>
          <div className="dash-card">
            <div className="dash-icon">
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
            <h3>Performance visibility</h3>
            <p>
              Understand how prepared your students are. See essay scores,
              matching results, and application readiness in real time.
            </p>
          </div>
          <div className="dash-card">
            <div className="dash-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2D6A4F"
                strokeWidth="1.8"
                aria-hidden
              >
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
              </svg>
            </div>
            <h3>Centralised data</h3>
            <p>
              Replace scattered spreadsheets and email threads. Everything your
              team needs — student data, progress, and insights — lives in one
              platform.
            </p>
          </div>
        </div>
      </div>

      <div className="section" style={{ paddingTop: 16 }}>
        <div className="section-label">What your students access</div>
        <div className="section-title">Tools that improve outcomes</div>
        <div className="section-sub">
          Every student at your school gets access to the full Univeera
          platform.
        </div>

        <div className="offer-grid">
          <div className="offer-card">
            <div className="offer-icon">
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
              <h3>University discovery</h3>
              <p>
                Students explore 180+ universities across 25 countries, filtered
                by field, budget, ranking, and location — helping them find
                better-fit options faster.
              </p>
            </div>
          </div>
          <div className="offer-card">
            <div className="offer-icon">
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
              <h3>Scholarship access</h3>
              <p>
                A curated database filtered by nationality and destination,
                increasing students&apos; access to funding opportunities they
                wouldn&apos;t find on their own.
              </p>
            </div>
          </div>
          <div className="offer-card">
            <div className="offer-icon">
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
              <h3>Essay feedback</h3>
              <p>
                AI-powered analysis that scores structure, voice, and quality —
                improving application quality before students hit submit.
              </p>
            </div>
          </div>
          <div className="offer-card">
            <div className="offer-icon">
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
            <div>
              <h3>Advisors and ambassadors</h3>
              <p>
                1:1 sessions with experienced advisors and real university
                ambassadors who can answer the questions counsellors don&apos;t
                always have time for.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="why-section">
        <div className="section" style={{ paddingBottom: 60 }}>
          <div className="section-label">Why this matters for your school</div>
          <div className="section-title">Better support. Less burden.</div>
          <div className="section-sub">
            Univeera doesn&apos;t replace your counselling team — it gives them
            better tools and more capacity.
          </div>

          <div className="why-grid">
            <div className="why-item">
              <div className="why-check">
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
              </div>
              <p>
                Support more students without increasing counsellor workload
              </p>
            </div>
            <div className="why-item">
              <div className="why-check">
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
              </div>
              <p>Improve the quality of applications across the board</p>
            </div>
            <div className="why-item">
              <div className="why-check">
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
              </div>
              <p>
                Give counsellors visibility into student progress and decisions
              </p>
            </div>
            <div className="why-item">
              <div className="why-check">
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
              </div>
              <p>
                Help students make more informed, confident university decisions
              </p>
            </div>
            <div className="why-item">
              <div className="why-check">
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
              </div>
              <p>
                Modernise your guidance offering with technology and real
                expertise
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="trust-section">
        <div className="trust-row">
          <div className="trust-card">
            <div className="trust-icon">
              <svg
                width="18"
                height="18"
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
            <p>Built for students across the Middle East</p>
          </div>
          <div className="trust-card">
            <div className="trust-icon">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2D6A4F"
                strokeWidth="1.8"
                aria-hidden
              >
                <path d="M22 2L11 13" />
                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </div>
            <p>Designed for international university pathways</p>
          </div>
          <div className="trust-card">
            <div className="trust-icon">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2D6A4F"
                strokeWidth="1.8"
                aria-hidden
              >
                <path d="M12 2l1 3.5L16.5 4l-1.5 3 3.5 1-3.5 1.5L16.5 13l-3.5-1.5L12 15l-1-3.5L7.5 13l1.5-3.5L5.5 8l3.5-1L7.5 4l3.5 1.5z" />
              </svg>
            </div>
            <p>Combines AI tools with real human support</p>
          </div>
        </div>
      </div>

      <div className="cta-section">
        <div className="cta-card">
          <h2 className="font-bold">Bring Univeera to your school</h2>
          <p>
            Get in touch to explore how we can support your students and your
            counselling team.
          </p>
          <Link className="btn" href="/contact">
            Get in touch <ArrowRight />
          </Link>
        </div>
      </div>

      <LandingFooter />
    </>
  );
}
