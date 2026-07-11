"use client";

import Link from "next/link";

import { ArrowForwardIcon } from "@/app/(protected)/student/_components/directional-icons";
import { useLocale } from "@/lib/i18n/locale-context";

import { usePostAdmissionBooking } from "./post-admission-booking-provider";

import "../post-admission-support.css";

const SERVICES = [
  {
    key: "visaSupport",
    icon: (
      <>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <polyline points="9 15 11 17 15 13" />
      </>
    ),
  },
  {
    key: "accommodation",
    icon: (
      <>
        <path d="M3 9.5L12 3l9 6.5V20a2 2 0 01-2 2H5a2 2 0 01-2-2V9.5z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>
    ),
  },
  {
    key: "tuitionPayment",
    icon: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <line x1="6" y1="14" x2="14" y2="14" />
      </>
    ),
  },
  {
    key: "scholarshipSearch",
    icon: (
      <>
        <circle cx="12" cy="8" r="6" />
        <polyline points="8.21 13.89 7 22 12 19 17 22 15.79 13.88" />
      </>
    ),
  },
  {
    key: "healthTravelInsurance",
    icon: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
  },
  {
    key: "flightBooking",
    icon: (
      <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    ),
  },
] as const;

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function PostAdmissionSupportClient() {
  const { dict } = useLocale();
  const t = dict.student.postAdmission;
  const { canBook, isPending, error, bookSession } = usePostAdmissionBooking();

  function handleTalkToAdvisor() {
    bookSession();
  }

  function scrollToServices() {
    document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div id="post-admission-support-scope">
      <div className="page">
        <div className="pas-hero">
          <div className="pas-hero-left">
            <h1 className="pas-hero-title">
              {t.landing.heroTitleBeforeEmphasis}{" "}
              <em>{t.landing.heroTitleEmphasis}</em>.
            </h1>
            <p className="pas-hero-sub">{t.landing.heroSubtitle}</p>
            <div className="pas-hero-actions">
              <button
                type="button"
                className="pas-hero-cta"
                disabled={isPending || !canBook}
                onClick={handleTalkToAdvisor}
              >
                {isPending ? t.landing.starting : t.landing.talkToAdvisor}
                <ArrowForwardIcon size={14} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                className="pas-hero-cta-secondary"
                onClick={scrollToServices}
              >
                {t.landing.browseServices}
                <ChevronDownIcon />
              </button>
            </div>
            {error ? (
              <p className="pas-error" role="alert">
                {error}
              </p>
            ) : null}
            {!canBook && !error ? (
              <p className="pas-unavailable">
                {t.landing.schedulingUnavailable}
              </p>
            ) : null}
          </div>

          <div className="pas-hero-right">
            <div className="pas-hero-preview">
              <div className="pas-hero-preview-badge">
                <span className="pas-hero-preview-badge-dot" />
                {t.landing.previewBadge}
              </div>
              <div className="pas-hero-preview-header">
                <div className="pas-hero-preview-label">
                  {t.landing.previewLabel}
                </div>
                <div className="pas-hero-preview-count">6</div>
              </div>
              <div className="pas-hero-preview-list">
                {t.landing.checklistItems.map((item) => (
                  <div key={item} className="pas-hero-preview-item">
                    <div className="pas-hero-preview-dot">
                      <CheckIcon />
                    </div>
                    <div className="pas-hero-preview-text">{item}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div id="services" className="section-header">
          <h2>{t.landing.servicesTitle}</h2>
          <div className="section-meta">{t.landing.servicesMeta}</div>
        </div>

        <div className="service-grid">
          {SERVICES.map((serviceMeta) => {
            const service = t.services[serviceMeta.key];
            return (
              <Link key={service.slug} href={service.href}>
                <div className="service-card">
                  <div className="service-icon">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      {serviceMeta.icon}
                    </svg>
                  </div>
                  <div className="service-body">
                    <div className="service-title">{service.title}</div>
                    <div className="service-desc">{service.desc}</div>
                  </div>
                  <div className="service-cta">
                  {t.landing.learnMore}
                  <ArrowForwardIcon size={13} strokeWidth={2.2} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          className="help-card-link"
          disabled={isPending || !canBook}
          onClick={handleTalkToAdvisor}
        >
          <div className="help-card">
            <div className="help-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <div className="help-left">
              <div className="help-title">{t.landing.helpTitle}</div>
              <div className="help-sub">{t.landing.helpSubtitle}</div>
            </div>
            <div className="help-cta">
              {isPending ? t.landing.starting : t.landing.bookSession}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
