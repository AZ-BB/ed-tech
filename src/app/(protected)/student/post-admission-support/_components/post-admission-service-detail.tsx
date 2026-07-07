"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import {
  ArrowBackIcon,
  ArrowForwardIcon,
} from "@/app/(protected)/student/_components/directional-icons";
import { useLocale } from "@/lib/i18n/locale-context";

import { usePostAdmissionBooking } from "./post-admission-booking-provider";

import "../post-admission-support.css";

type PostAdmissionServiceKey =
  | "visaSupport"
  | "accommodation"
  | "tuitionPayment"
  | "scholarshipSearch"
  | "healthTravelInsurance"
  | "flightBooking";

export type PostAdmissionServiceDetailProps = {
  serviceKey: PostAdmissionServiceKey;
  heroIcon: ReactNode;
};

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function FaqPlusIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function PostAdmissionServiceDetail({
  serviceKey,
  heroIcon,
}: PostAdmissionServiceDetailProps) {
  const { dict } = useLocale();
  const t = dict.student.postAdmission;
  const service = t.services[serviceKey];
  const { canBook, isPending, error, bookSession } = usePostAdmissionBooking();

  function handleBookSession() {
    bookSession({ serviceLabel: service.title });
  }

  return (
    <div id="post-admission-support-scope">
      <div className="page">
        <Link
          href="/student/post-admission-support"
          className="pas-detail-breadcrumb"
        >
          <ArrowBackIcon size={14} />
          {t.detail.breadcrumb}
        </Link>

        <div className="pas-detail-hero">
          <div className="pas-detail-hero-content">
            <div className="pas-detail-eyebrow">{t.detail.eyebrow}</div>
            <h1 className="pas-detail-title">{service.title}</h1>
            <p className="pas-detail-summary">{service.summary}</p>
          </div>
          <div className="pas-detail-hero-icon" aria-hidden>
            {heroIcon}
          </div>
        </div>

        <div className="pas-detail-layout">
          <div className="pas-detail-main">
            <section className="pas-detail-section">
              <h2 className="pas-detail-section-title">
                {t.detail.includedTitle}
              </h2>
              <ul className="pas-detail-includes">
                {service.includes.map((item) => (
                  <li key={item} className="pas-detail-include-item">
                    <span className="pas-detail-include-check">
                      <CheckIcon />
                    </span>
                    <span className="pas-detail-include-text">{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="pas-detail-section">
              <h2 className="pas-detail-section-title">
                {t.detail.howItWorksTitle}
              </h2>
              <ol className="pas-detail-steps">
                {service.steps.map((step, index) => (
                  <li key={step.title} className="pas-detail-step">
                    <span className="pas-detail-step-num">{index + 1}</span>
                    <div className="pas-detail-step-content">
                      <div className="pas-detail-step-title">{step.title}</div>
                      <p className="pas-detail-step-desc">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="pas-detail-section">
              <h2 className="pas-detail-section-title">
                {t.detail.partnersTitle}
              </h2>
              <div className="pas-detail-partners">
                {service.partners.map((partner) => (
                  <span key={partner} className="pas-detail-partner">
                    {partner}
                  </span>
                ))}
              </div>
            </section>

            <section className="pas-detail-section">
              <h2 className="pas-detail-section-title">{t.detail.faqTitle}</h2>
              <div className="pas-detail-faq-list">
                {service.faqs.map((faq) => (
                  <details key={faq.question} className="pas-detail-faq-item">
                    <summary className="pas-detail-faq-q">
                      <span>{faq.question}</span>
                      <span className="pas-detail-faq-q-icon">
                        <FaqPlusIcon />
                      </span>
                    </summary>
                    <p className="pas-detail-faq-a">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          </div>

          <aside className="pas-detail-aside">
            <div className="pas-detail-aside-card pas-detail-cta-aside">
              <div className="pas-detail-aside-eyebrow">
                {service.cta.eyebrow}
              </div>
              <div className="pas-detail-aside-title">{service.cta.title}</div>
              <p className="pas-detail-aside-sub">{service.cta.description}</p>
              <button
                type="button"
                className="pas-detail-cta-button"
                disabled={isPending || !canBook}
                onClick={handleBookSession}
              >
                {isPending ? t.detail.starting : service.cta.buttonLabel}
                <ArrowForwardIcon size={14} />
              </button>
              {error ? (
                <p className="pas-detail-cta-error" role="alert">
                  {error}
                </p>
              ) : null}
              {!canBook && !error ? (
                <p className="pas-detail-cta-unavailable">
                  {t.detail.schedulingUnavailable}
                </p>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
