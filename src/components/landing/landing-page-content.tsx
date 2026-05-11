import { HowItWorksCta } from "@/components/landing/how-it-works-cta";
import { LandingFaq } from "@/components/landing/landing-faq";

export function LandingPageContent() {
  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-badge fade-up d1">
              <div className="hero-badge-dot" />
              Built for students across the Middle East
            </div>
            <h1 className="serif fade-up d2">
              From confusion to <em>acceptance</em>
            </h1>
            <p className="hero-sub fade-up d3">
              Discover, prepare, and apply to universities — all in one platform
              designed to guide you from your first search to your acceptance
              letter.
            </p>
            <div className="hero-ctas fade-up d4">
              <a href="/signup" style={{ textDecoration: "none" }}>
                <button type="button" className="btn-hero">
                  Start your journey{" "}
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
                </button>
              </a>
              <a href="/login" style={{ textDecoration: "none" }}>
                <button type="button" className="btn-ghost">
                  Log in
                </button>
              </a>
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
                    <div style={{ fontSize: "13px", fontWeight: 600 }}>
                      Essay score
                    </div>
                    <div className="hv-score-text">
                      Strong intro, improve conclusion
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    height: "4px",
                    background: "var(--border-light)",
                    borderRadius: "2px",
                    marginTop: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "75%",
                      height: "100%",
                      background: "var(--green)",
                      borderRadius: "2px",
                    }}
                  />
                </div>
              </div>
              <div className="hv-card hv-3">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "6px",
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "var(--green-bg)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2D6A4F"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <path d="M12 2l3 6.5L22 9l-5 4.9L18.2 21 12 17.3 5.8 21 7 13.9 2 9l7-0.5z" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 600 }}>
                      Scholarship found
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "var(--text-light)",
                      }}
                    >
                      Full ride — UAE nationals
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--green)",
                    fontWeight: 600,
                  }}
                >
                  MOHESR Program →
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="how-it-works">
        <div className="section-inner">
          <div className="section-label">How it works</div>
          <div className="section-title serif">
            A simpler way to navigate your university journey
          </div>
          <div className="section-sub">
            Five steps from exploration to your acceptance letter.
          </div>

          <div className="how-grid">
            <div className="how-line" />
            <div className="how-step">
              <div className="how-num">1</div>
              <div className="how-step-title">Create your profile</div>
              <div className="how-step-desc">
                Tell us about your academic background, interests, and preferred
                destinations.
              </div>
            </div>
            <div className="how-step">
              <div className="how-num">2</div>
              <div className="how-step-title">Explore universities</div>
              <div className="how-step-desc">
                Search and filter 1,000+ universities matched to your profile.
              </div>
            </div>
            <div className="how-step">
              <div className="how-num">3</div>
              <div className="how-step-title">Prepare with confidence</div>
              <div className="how-step-desc">
                Access test prep, essay tools, and resources to strengthen your
                application.
              </div>
            </div>
            <div className="how-step">
              <div className="how-num">4</div>
              <div className="how-step-title">Get real guidance</div>
              <div className="how-step-desc">
                Speak to advisors and students who have already been through it.
              </div>
            </div>
            <div className="how-step">
              <div className="how-num">5</div>
              <div className="how-step-title">Apply smarter</div>
              <div className="how-step-desc">
                Apply with the right support — or let us handle the process for
                you.
              </div>
            </div>
          </div>
          <HowItWorksCta />
        </div>
      </section>

      <section className="features-section" id="features">
        <div className="section-inner">
          <div className="section-label">Everything you need</div>
          <div className="section-title serif">One platform, every tool</div>
          <div className="section-sub">
            From choosing the right university to submitting your application.
          </div>

          <div className="feat-grid">
            <div className="feat-card">
              <div
                className="feat-icon"
                style={{ background: "var(--green-bg)" }}
              >
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
              <div className="feat-name">AI university matching</div>
              <div className="feat-desc">
                Answer a few questions and get top university recommendations
                tailored for you.
              </div>
            </div>
            <div className="feat-card">
              <div className="feat-icon" style={{ background: "#E6F1FB" }}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#185FA5"
                  strokeWidth="1.8"
                  aria-hidden
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="feat-name">University search database</div>
              <div className="feat-desc">
                Browse local, regional, and global universities with detailed
                requirements.
              </div>
            </div>
            <div className="feat-card">
              <div className="feat-icon" style={{ background: "#FAEEDA" }}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#854F0B"
                  strokeWidth="1.8"
                  aria-hidden
                >
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <div className="feat-name">University ambassadors</div>
              <div className="feat-desc">
                Speak to students who have already studied at your target
                university.
              </div>
            </div>
            <div className="feat-card">
              <div className="feat-icon" style={{ background: "#EEEDFE" }}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#534AB7"
                  strokeWidth="1.8"
                  aria-hidden
                >
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="feat-name">1:1 advisor sessions</div>
              <div className="feat-desc">
                Get expert guidance tailored to your goals and application
                strategy.
              </div>
            </div>
            <div className="feat-card">
              <div
                className="feat-icon"
                style={{ background: "var(--green-bg)" }}
              >
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
              <div className="feat-name">Essay support (AI-powered)</div>
              <div className="feat-desc">
                Receive actionable feedback to improve your personal statement.
              </div>
            </div>
            <div className="feat-card">
              <div className="feat-icon" style={{ background: "#FCEBEB" }}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#A32D2D"
                  strokeWidth="1.8"
                  aria-hidden
                >
                  <path d="M4 7h16M4 12h16M4 17h10" />
                </svg>
              </div>
              <div className="feat-name">Test prep (SAT, IELTS, ACT)</div>
              <div className="feat-desc">
                Practice with real tests and get AI insights on how to improve.
              </div>
            </div>
            <div className="feat-card">
              <div className="feat-icon" style={{ background: "#E6F1FB" }}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#185FA5"
                  strokeWidth="1.8"
                  aria-hidden
                >
                  <path d="M12 2l3 6.5L22 9l-5 4.9L18.2 21 12 17.3 5.8 21 7 13.9 2 9l7-0.5z" />
                </svg>
              </div>
              <div className="feat-name">Scholarship opportunities</div>
              <div className="feat-desc">
                Find and filter scholarships that match your profile and needs.
              </div>
            </div>
            <div className="feat-card">
              <div className="feat-icon" style={{ background: "#FAEEDA" }}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#854F0B"
                  strokeWidth="1.8"
                  aria-hidden
                >
                  <path d="M22 2L11 13" />
                  <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </div>
              <div className="feat-name">Application support</div>
              <div className="feat-desc">
                Tell us your targets — we&apos;ll handle the full application
                process for you.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="proof-section">
        <div className="section-inner" style={{ textAlign: "center" }}>
          <div className="section-label" style={{ textAlign: "center" }}>
            Trusted by students across the region
          </div>
          <div
            className="section-title serif"
            style={{
              maxWidth: "100%",
              textAlign: "center",
              margin: "0 auto 0",
            }}
          >
            Real impact, real numbers
          </div>
          <div className="proof-grid">
            <div className="proof-card">
              <div className="proof-num">10,000+</div>
              <div className="proof-label">Students supported</div>
            </div>
            <div className="proof-card">
              <div className="proof-num">50+</div>
              <div className="proof-label">Partner schools</div>
            </div>
            <div className="proof-card">
              <div className="proof-num">1,000+</div>
              <div className="proof-label">Advisory sessions</div>
            </div>
            <div className="proof-card">
              <div className="proof-num">500+</div>
              <div className="proof-label">Universities covered</div>
            </div>
          </div>
        </div>
      </section>

      <section className="testi-section" id="testimonials">
        <div className="section-inner">
          <div className="section-label">What students say</div>
          <div className="section-title serif">Real results, real stories</div>
          <div className="testi-grid">
            <div className="testi-card">
              <div className="testi-quote">
                I had no idea where to start. The AI matching helped me
                shortlist universities that actually fit my profile and goals.
              </div>
              <div className="testi-author">
                <div
                  className="testi-avatar"
                  style={{
                    background: "var(--green-bg)",
                    color: "var(--green)",
                  }}
                >
                  NA
                </div>
                <div>
                  <div className="testi-name">Noura A.</div>
                  <div className="testi-uni">
                    Accepted — University of Manchester 🇬🇧
                  </div>
                </div>
              </div>
            </div>
            <div className="testi-card">
              <div className="testi-quote">
                My personal statement felt weak, but the AI essay feedback
                pushed me to rewrite it and really stand out.
              </div>
              <div className="testi-author">
                <div
                  className="testi-avatar"
                  style={{ background: "#E6F1FB", color: "#185FA5" }}
                >
                  MK
                </div>
                <div>
                  <div className="testi-name">Mohammed K.</div>
                  <div className="testi-uni">Accepted — NYU Abu Dhabi 🇦🇪</div>
                </div>
              </div>
            </div>
            <div className="testi-card">
              <div className="testi-quote">
                I was unsure about studying abroad. Speaking to someone already
                there gave me the clarity and confidence to apply.
              </div>
              <div className="testi-author">
                <div
                  className="testi-avatar"
                  style={{ background: "#FAEEDA", color: "#854F0B" }}
                >
                  SR
                </div>
                <div>
                  <div className="testi-name">Sara R.</div>
                  <div className="testi-uni">
                    Accepted — University of Toronto 🇨🇦
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mission-section">
        <div className="mission-inner">
          <div className="mission-label">Our mission</div>
          <div className="mission-title serif">
            Empowering students across the Middle East to access better
            education
          </div>
          <div className="mission-desc">
            Built by professionals who experienced the challenges of the
            university application journey firsthand. We believe every student
            deserves clear guidance, accessible tools, and real support —
            regardless of background.
          </div>
        </div>
      </section>

      <LandingFaq />

      <section className="cta-section">
        <div className="cta-card">
          <div className="cta-title serif">Start your journey today</div>
          <div className="cta-sub">Take the first step toward your future.</div>
          <div className="cta-btns">
            <a href="/signup" style={{ textDecoration: "none" }}>
              <button type="button" className="btn-hero">
                Sign up{" "}
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
              </button>
            </a>
            <a href="/login" style={{ textDecoration: "none" }}>
              <button type="button" className="btn-ghost">
                Log in
              </button>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
