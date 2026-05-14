import Link from "next/link";
import {
  AboutPeopleIllustration,
  AboutStoryIllustration,
} from "@/app/about/about-illustrations";
import { LandingFooter } from "@/components/landing/landing-footer";

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#2D6A4F"
      strokeWidth="2.5"
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function PillCheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#2D6A4F"
      strokeWidth="2.5"
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function ArrowIcon() {
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

export default function AboutPage() {
  return (
    <>
      <nav className="nav" id="navbar">
        <Link className="nav-logo" href="/">
          <div className="nav-logo-icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          Univeera
        </Link>
        <div className="nav-links">
          <Link className="nav-link" href="/#how-it-works">
            How it works
          </Link>
          <Link className="nav-link" href="/#features">
            Features
          </Link>
          <Link className="nav-link" href="/#testimonials">
            Testimonials
          </Link>
          <Link className="nav-link" href="/#faq">
            FAQ
          </Link>
          <Link className="nav-login" href="#">
            Log in
          </Link>
          <Link className="nav-cta" href="#">
            Start your journey
          </Link>
        </div>
      </nav>

      <div className="about-hero">
        <h1>We built what we wish we had</h1>
        <p>
          Applying to university shouldn&apos;t feel confusing, overwhelming, or
          lonely. We created Univeera to simplify the journey — and give
          students the clarity we never had.
        </p>
      </div>

      <div className="split">
        <div className="split-text">
          <div className="split-label">Our story</div>
          <div className="split-title">
            It started with the same problem you&apos;re facing
          </div>
          <p>We&apos;ve been there.</p>
          <p>
            Scrolling endlessly through university websites. Trying to figure
            out requirements that don&apos;t make sense. Not knowing where to
            apply, what matters, or who to trust.
          </p>
          <p>
            We relied on random advice, outdated information, and guesswork —
            and it shouldn&apos;t have been that way.
          </p>
          <p>So we asked a simple question:</p>
          <div className="highlight-quote">
            &quot;What if everything a student needs existed in one place?&quot;
          </div>
          <p>That&apos;s where Univeera started.</p>
        </div>
        <div className="split-visual">
          <div className="illus-card">
            <AboutStoryIllustration />
          </div>
        </div>
      </div>

      <div className="divider" />

      <div className="bg-white section-border">
        <div className="features-section">
          <div className="features-label">What we&apos;re building</div>
          <div className="features-title">
            Not just a platform — a better way to apply
          </div>
          <div className="features-sub">
            Univeera brings together everything students need into one simple
            experience.
          </div>
          <div className="feat-grid">
            <div className="feat-card">
              <div className="feat-icon">
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
                <h3>Discover the right universities</h3>
                <p>
                  Find institutions that actually match your profile, goals, and
                  budget — not just the ones everyone talks about.
                </p>
              </div>
            </div>
            <div className="feat-card">
              <div className="feat-icon">
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
                <h3>Find hidden scholarships</h3>
                <p>
                  Access scholarships you didn&apos;t know existed, filtered by
                  nationality, destination, and coverage level.
                </p>
              </div>
            </div>
            <div className="feat-card">
              <div className="feat-icon">
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
                <h3>Get real essay feedback</h3>
                <p>
                  Detailed, structured analysis that helps you improve — not
                  just a grammar check.
                </p>
              </div>
            </div>
            <div className="feat-card">
              <div className="feat-icon">
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
                <h3>Talk to people who&apos;ve been there</h3>
                <p>
                  Connect with advisors and real university ambassadors who can
                  answer what Google can&apos;t.
                </p>
              </div>
            </div>
          </div>
          <p
            style={{
              textAlign: "center",
              fontSize: "15px",
              color: "var(--text-light)",
              marginTop: "28px",
            }}
          >
            No more guessing. No more scattered information. No more doing it
            alone.
          </p>
        </div>
      </div>

      <div className="split reverse">
        <div className="split-text">
          <div className="split-label">The human touch</div>
          <div className="split-title">Real people. Real guidance.</div>
          <p>
            We believe technology should guide you — not replace human support.
          </p>
          <p>That&apos;s why Univeera combines:</p>
          <ul className="check-list">
            <li>
              <CheckIcon />
              AI tools for speed and insights
            </li>
            <li>
              <CheckIcon />
              Real advisors and students for experience and perspective
            </li>
          </ul>
          <p>Because the best decisions come from both.</p>
        </div>
        <div className="split-visual">
          <div className="illus-card">
            <AboutPeopleIllustration />
          </div>
        </div>
      </div>

      <div className="divider" />

      <div className="bg-pale">
        <div
          style={{
            maxWidth: "1080px",
            margin: "0 auto",
            padding: "90px 40px",
            textAlign: "center",
          }}
        >
          <div className="split-label" style={{ textAlign: "center" }}>
            Why it matters
          </div>
          <div
            style={{
              fontFamily: "var(--font-dm-serif), 'DM Serif Display', serif",
              fontSize: "34px",
              marginBottom: "14px",
              lineHeight: "1.18",
            }}
          >
            Because this decision changes everything
          </div>
          <p
            style={{
              fontSize: "16px",
              color: "var(--text-light)",
              maxWidth: "500px",
              margin: "0 auto 40px",
              lineHeight: "1.7",
            }}
          >
            Where you study shapes your opportunities, your network, and your
            future. We don&apos;t take that lightly.
          </p>
          <div className="why-strip">
            <div className="why-item">
              <div className="why-num">01</div>
              <div>
                <p>
                  <strong>Your opportunities</strong>
                  <br />
                  The doors that open — and the ones that don&apos;t — start
                  with this choice.
                </p>
              </div>
            </div>
            <div className="why-item">
              <div className="why-num">02</div>
              <div>
                <p>
                  <strong>Your network</strong>
                  <br />
                  The people you meet at university become your lifelong
                  community.
                </p>
              </div>
            </div>
            <div className="why-item">
              <div className="why-num">03</div>
              <div>
                <p>
                  <strong>Your future</strong>
                  <br />
                  This decision echoes through your career, your confidence, and
                  your life.
                </p>
              </div>
            </div>
          </div>
          <div
            className="highlight-quote"
            style={{
              maxWidth: "520px",
              margin: "44px auto 0",
              textAlign: "center",
              borderLeft: "none",
              borderTop: "3px solid var(--green)",
              borderRadius: "0 0 var(--radius-lg) var(--radius-lg)",
            }}
          >
            Our goal is simple: help every student make smarter, more confident
            decisions.
          </div>
        </div>
      </div>

      <div className="vision">
        <div className="split-label" style={{ textAlign: "center" }}>
          Our vision
        </div>
        <h2>Built for students across the Middle East — and beyond</h2>
        <p>
          We&apos;re starting by helping students in the Middle East access
          better global opportunities. But this is bigger than that.
        </p>
        <p>We&apos;re building a future where:</p>
        <div className="vision-pills">
          <div className="vision-pill">
            <PillCheckIcon />
            Equal access to guidance
          </div>
          <div className="vision-pill">
            <PillCheckIcon />
            Geography doesn&apos;t limit opportunity
          </div>
          <div className="vision-pill">
            <PillCheckIcon />
            Clarity over confusion
          </div>
        </div>
      </div>

      <div className="cta-section">
        <div className="cta-card">
          <h2>Start your journey with us</h2>
          <p>
            Take the first step toward clarity, confidence, and better
            decisions.
          </p>
          <div className="cta-btns">
            <Link className="btn" href="#">
              Start your journey <ArrowIcon />
            </Link>
            <Link className="btn btn-outline" href="/#features">
              Explore features
            </Link>
          </div>
        </div>
      </div>

      <LandingFooter />
    </>
  );
}
