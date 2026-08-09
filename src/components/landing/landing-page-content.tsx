import { PTR_UNIS } from "@/components/landing/data/landing-page-data";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingHeroCluster } from "@/components/landing/landing-hero-cluster";
import { LandingPlatformVideo } from "@/components/landing/landing-platform-video";
import { PTR_ICONS, TOOL_ICONS } from "@/components/landing/landing-icons";
import { ServerLocalizedLink } from "@/lib/i18n/server-localized-link";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

type LandingPageContentProps = {
  dict: Dictionary;
  locale: Locale;
  signupHref?: string;
};

function ArrowIcon() {
  return (
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
  );
}

export function LandingPageContent({
  dict,
  locale,
  signupHref = "/signup",
}: LandingPageContentProps) {
  const h = dict.home;

  return (
    <>
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-badge fade-up d1">
              <div className="hero-badge-dot" />
              {h.heroBadge}
            </div>
            <h1 id="hero-heading" className="serif fade-up d2">
              {h.heroTitleLine1}
              <br />
              <em>{h.heroTitleEm}</em>
            </h1>
            <p className="hero-sub fade-up d3">{h.heroSub}</p>
            <div className="hero-ctas fade-up d4">
              <ServerLocalizedLink href={signupHref} locale={locale} style={{ textDecoration: "none" }}>
                <button type="button" className="btn-hero">
                  {dict.nav.startJourney} <ArrowIcon />
                </button>
              </ServerLocalizedLink>
              <a href="#video" style={{ textDecoration: "none" }}>
                <button type="button" className="btn-ghost">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    style={{ marginRight: 2 }}
                    aria-hidden
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {h.watchTour}
                </button>
              </a>
            </div>
            <div className="hero-trust fade-up d5">{h.heroTrust}</div>
          </div>
          <div className="hero-right fade-in d5">
            <LandingHeroCluster caption={h.heroClusterCaption} />
          </div>
        </div>
      </section>

      <section className="video-section" id="video" aria-labelledby="video-heading">
        <div className="video-inner">
          <div className="section-label" style={{ justifyContent: "center" }}>
            {h.videoLabel}
          </div>
          <h2 id="video-heading" className="video-title serif">
            {h.videoTitle}
          </h2>
          <p className="video-sub">{h.videoSub}</p>
          <LandingPlatformVideo badge={h.videoBadge} title={h.videoTitle} />
          <div className="video-note">{h.videoNote}</div>
          <div style={{ marginTop: 26 }}>
            <ServerLocalizedLink href={signupHref} locale={locale} style={{ textDecoration: "none" }}>
              <button type="button" className="btn-hero" style={{ margin: "0 auto" }}>
                {dict.nav.startJourney} <ArrowIcon />
              </button>
            </ServerLocalizedLink>
          </div>
        </div>
      </section>

      <section className="ptr-section" id="track-record" aria-labelledby="track-record-heading">
        <div className="ptr-inner">
          <div className="ptr-head">
            <div className="ptr-eyebrow">
              <span className="dot" />
              {h.proofLabel}
            </div>
            <h2 id="track-record-heading" className="ptr-title serif">
              {h.proofTitle}
            </h2>
            <p className="ptr-sub">{h.proofSub}</p>
          </div>
          <div className="ptr-grid">
            {h.ptrMetrics.map((metric) => (
              <div key={metric.label} className="ptr-card">
                <div className="ptr-ic">{PTR_ICONS[metric.icon]}</div>
                <div className="ptr-num">{metric.num}</div>
                <div className="ptr-label">{metric.label}</div>
                <div className="ptr-support">{metric.support}</div>
              </div>
            ))}
          </div>
          <div className="ptr-marquee-wrap">
            <div className="ptr-marquee-head">{h.marqueeHead}</div>
            <div className="ptr-marquee">
              <div className="ptr-track">
                {[...PTR_UNIS, ...PTR_UNIS].map((uni, i) => (
                  <div key={`${uni}-${i}`} className="uni-word">
                    <span className="uni-dot" />
                    <span>{uni}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="adv-section" id="advisors" aria-labelledby="advisors-heading">
        <div className="adv-inner">
          <div className="adv-head">
            <div className="adv-eyebrow">
              <span className="dot" />
              {h.advisorsEyebrow}
            </div>
            <h2 id="advisors-heading" className="adv-title">
              {h.advisorsTitle}
            </h2>
            <p className="adv-sub">{h.advisorsSub}</p>
          </div>
          <div className="adv-grid">
            {h.advisors.map((advisor) => (
              <div key={advisor.name} className="adv-card">
                <div className="adv-photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={advisor.img} alt={advisor.name} loading="lazy" />
                </div>
                <div className="adv-body">
                  <div className="adv-name">{advisor.name}</div>
                  <div className="adv-cred">{advisor.cred}</div>
                  <div className="adv-role">{advisor.role}</div>
                  {"tag" in advisor && advisor.tag ? (
                    <span className="adv-tag">{advisor.tag}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <div className="adv-cta">
            <ServerLocalizedLink href={signupHref} locale={locale} style={{ textDecoration: "none" }}>
              <button type="button" className="adv-btn">
                {h.exploreAdvisors}{" "}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  aria-hidden
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </ServerLocalizedLink>
            <div className="adv-cta-note">{h.advisorsCtaNote}</div>
          </div>
        </div>
      </section>

      <section className="features-section" id="features" aria-labelledby="features-heading">
        <div className="section-inner">
          <div className="section-label">{h.featuresLabel}</div>
          <h2 id="features-heading" className="section-title serif">
            {h.featuresTitle}
          </h2>
          <div className="section-sub">{h.featuresSub}</div>
          <div className="feat-grid">
            {h.tools.map((tool) => (
              <ServerLocalizedLink
                key={tool.title}
                href={signupHref}
                locale={locale}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="feat-card">
                  <div className="feat-icon">{TOOL_ICONS[tool.icon]}</div>
                  <div className="feat-name">{tool.title}</div>
                  <div className="feat-desc">{tool.desc}</div>
                </div>
              </ServerLocalizedLink>
            ))}
          </div>
        </div>
      </section>

      <section className="amb-section" id="ambassadors" aria-labelledby="ambassadors-heading">
        <div className="amb-inner">
          <div className="amb-left">
            <div className="amb-eyebrow">
              <span className="dot" />
              {h.ambassadorsEyebrow}
            </div>
            <h2 id="ambassadors-heading" className="amb-title">
              {h.ambassadorsTitle}
            </h2>
            <p className="amb-lead">{h.ambassadorsLead}</p>
            <p className="amb-sub">{h.ambassadorsSub}</p>
            <ServerLocalizedLink href={signupHref} locale={locale} style={{ textDecoration: "none" }}>
              <button type="button" className="amb-cta-btn">
                {h.exploreAmbassadors}{" "}
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  aria-hidden
                >
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </button>
            </ServerLocalizedLink>
          </div>
          <div className="amb-grid">
            {h.ambassadors.map((amb) => (
              <div key={amb.name} className="amb-card">
                <div className="amb-photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={amb.img} alt={amb.name} loading="lazy" />
                </div>
                <div className="amb-name">{amb.name}</div>
                <div className="amb-uni">{amb.university}</div>
                <div className="amb-loc">
                  {amb.flag} {amb.country}
                </div>
                <div className="amb-tags">
                  {amb.tags.map((tag) => (
                    <span key={tag} className="amb-tag">
                      {tag}
                    </span>
                  ))}
                </div>
                <button type="button" className="amb-btn">
                  {h.askAmbassador}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="how-it-works" aria-labelledby="how-it-works-heading">
        <div className="section-inner">
          <div className="section-label">{h.howItWorksLabel}</div>
          <h2 id="how-it-works-heading" className="section-title serif">
            {h.howItWorksTitle}
          </h2>
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
          <div className="how-cta">
            <ServerLocalizedLink href={signupHref} locale={locale} style={{ textDecoration: "none" }}>
              <button type="button" className="btn-hero" style={{ margin: "0 auto" }}>
                {dict.nav.startJourney} <ArrowIcon />
              </button>
            </ServerLocalizedLink>
          </div>
        </div>
      </section>

      <section className="testi-section" id="testimonials" aria-labelledby="testimonials-heading">
        <div className="section-inner">
          <div className="section-label">{h.testiLabel}</div>
          <h2 id="testimonials-heading" className="section-title serif">
            {h.testiTitle}
          </h2>
          <div className="section-sub">{h.testiSub}</div>
          <div className="testi-grid">
            {h.testimonials.map((t, i) => (
              <div key={t.name} className="testi-card">
                <div className="testi-quote">{t.quote}</div>
                <div className="testi-author">
                  <div
                    className="testi-avatar"
                    style={{
                      background:
                        i === 0
                          ? "var(--green-bg)"
                          : i === 1
                            ? "#E6F1FB"
                            : "#FAEEDA",
                      color:
                        i === 0
                          ? "var(--green)"
                          : i === 1
                            ? "#185FA5"
                            : "#854F0B",
                    }}
                  >
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

      <LandingFaq label={h.faqLabel} title={h.faqTitle} items={h.faqItems} />

      <section className="mission-section" aria-labelledby="mission-heading">
        <div className="mission-inner">
          <div className="mission-label">{h.missionLabel}</div>
          <h2 id="mission-heading" className="mission-title serif">
            {h.missionTitle}
          </h2>
          <div className="mission-desc">{h.missionDesc}</div>
        </div>
      </section>

      <section className="cta-section" aria-labelledby="cta-heading">
        <div className="cta-card">
          <h2 id="cta-heading" className="cta-title serif">
            {h.ctaTitle}
          </h2>
          <div className="cta-sub">{h.ctaSub}</div>
          <div className="cta-btns">
            <ServerLocalizedLink href={signupHref} locale={locale} style={{ textDecoration: "none" }}>
              <button type="button" className="btn-hero">
                {dict.nav.startJourney} <ArrowIcon />
              </button>
            </ServerLocalizedLink>
          </div>
          <div className="cta-reassure">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              aria-hidden
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            {h.ctaReassure}
          </div>
          <div className="cta-login">
            {h.ctaLoginPrefix}{" "}
            <ServerLocalizedLink href="/login" locale={locale}>
              {dict.nav.logIn}
            </ServerLocalizedLink>
          </div>
        </div>
      </section>
    </>
  );
}
