"use client";

import clsx from "clsx";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { submitInternshipSupportRequest } from "@/actions/internship-support";
import { useLocale } from "@/lib/i18n/locale-context";

type Props = {
  open: boolean;
  onClose: () => void;
};

const INTEREST_KEYS = [
  "Business",
  "Finance",
  "Medicine",
  "Engineering",
  "Law",
  "Technology",
  "Marketing",
  "Design",
  "Sustainability",
  "Other",
] as const;

export function InternshipRequestModal({ open, onClose }: Props) {
  const { dict } = useLocale();
  const t = dict.student.internships;
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interests, setInterests] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setSuccess(false);
      setError(null);
    }
  }, [open]);

  const toggleInterest = (key: string) => {
    setInterests((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const interestLabel = (key: (typeof INTEREST_KEYS)[number]): string => {
    const map: Record<(typeof INTEREST_KEYS)[number], string> = {
      Business: t.interestBusiness,
      Finance: t.interestFinance,
      Medicine: t.interestMedicine,
      Engineering: t.interestEngineering,
      Law: t.interestLaw,
      Technology: t.interestTechnology,
      Marketing: t.interestMarketing,
      Design: t.interestDesign,
      Sustainability: t.interestSustainability,
      Other: t.interestOther,
    };
    return map[key];
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const result = await submitInternshipSupportRequest({
        fullName: String(fd.get("fullName") ?? ""),
        email: String(fd.get("email") ?? ""),
        schoolName: String(fd.get("schoolName") ?? ""),
        grade: String(fd.get("grade") ?? ""),
        preferredLocation: String(fd.get("preferredLocation") ?? ""),
        preferredFormat: String(fd.get("preferredFormat") ?? ""),
        interests: [...interests],
        payPreference: String(fd.get("payPreference") ?? ""),
        message: String(fd.get("message") ?? ""),
      });
      if (!result.ok) {
        setError(result.error || t.submitFailed);
        return;
      }
      setSuccess(true);
      form.reset();
      setInterests(new Set());
    });
  };

  if (!open) return null;

  return (
    <div
      className={clsx("internship-req-overlay", "show")}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="req-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="internship-req-title"
      >
        <div className="req-modal-head">
          <div>
            <h3 id="internship-req-title">{t.requestModalTitle}</h3>
            <p>{t.requestModalSub}</p>
          </div>
          <button
            type="button"
            className="req-close"
            onClick={onClose}
            aria-label={t.close}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {!success ? (
          <div className="req-modal-body">
            <form onSubmit={onSubmit}>
              <div className="req-row">
                <div className="req-field">
                  <label htmlFor="rq-name">{t.fullName}</label>
                  <input
                    className="req-input"
                    id="rq-name"
                    name="fullName"
                    type="text"
                    required
                    placeholder={t.fullNamePlaceholder}
                  />
                </div>
                <div className="req-field">
                  <label htmlFor="rq-email">{t.email}</label>
                  <input
                    className="req-input"
                    id="rq-email"
                    name="email"
                    type="email"
                    required
                    placeholder={t.emailPlaceholder}
                  />
                </div>
              </div>
              <div className="req-row">
                <div className="req-field">
                  <label htmlFor="rq-school">{t.schoolName}</label>
                  <input
                    className="req-input"
                    id="rq-school"
                    name="schoolName"
                    type="text"
                    required
                    placeholder={t.schoolNamePlaceholder}
                  />
                </div>
                <div className="req-field">
                  <label htmlFor="rq-grade">{t.grade}</label>
                  <select
                    className="req-input"
                    id="rq-grade"
                    name="grade"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      {t.selectGrade}
                    </option>
                    <option value="Grade 9">{t.grade9}</option>
                    <option value="Grade 10">{t.grade10}</option>
                    <option value="Grade 11">{t.grade11}</option>
                    <option value="Grade 12">{t.grade12}</option>
                    <option value="Gap year">{t.gapYear}</option>
                    <option value="Other">{t.gradeOther}</option>
                  </select>
                </div>
              </div>
              <div className="req-row">
                <div className="req-field">
                  <label htmlFor="rq-loc">{t.preferredLocation}</label>
                  <select
                    className="req-input"
                    id="rq-loc"
                    name="preferredLocation"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      {t.selectLocation}
                    </option>
                    <optgroup label={t.optGroupGcc}>
                      <option value="United Arab Emirates">{t.locUae}</option>
                      <option value="Saudi Arabia">{t.locSaudi}</option>
                      <option value="Qatar">{t.locQatar}</option>
                      <option value="Kuwait">{t.locKuwait}</option>
                      <option value="Bahrain">{t.locBahrain}</option>
                      <option value="Oman">{t.locOman}</option>
                    </optgroup>
                    <optgroup label={t.optGroupLevant}>
                      <option value="Jordan">{t.locJordan}</option>
                      <option value="Lebanon">{t.locLebanon}</option>
                      <option value="Egypt">{t.locEgypt}</option>
                    </optgroup>
                    <optgroup label={t.optGroupFlexible}>
                      <option value="Anywhere in MENA">
                        {t.locMenaAnywhere}
                      </option>
                      <option value="Remote / Online">{t.locRemote}</option>
                    </optgroup>
                  </select>
                </div>
                <div className="req-field">
                  <label htmlFor="rq-format">{t.preferredFormat}</label>
                  <select
                    className="req-input"
                    id="rq-format"
                    name="preferredFormat"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      {t.selectFormat}
                    </option>
                    <option value="In-person">{t.formatInPerson}</option>
                    <option value="Online">{t.formatOnline}</option>
                    <option value="Hybrid">{t.formatHybrid}</option>
                  </select>
                </div>
              </div>
              <div className="req-field">
                <label>{t.areasOfInterest}</label>
                <div className="req-interests">
                  {INTEREST_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={clsx("req-chip", interests.has(key) && "on")}
                      onClick={() => toggleInterest(key)}
                    >
                      {interestLabel(key)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="req-field">
                <label htmlFor="rq-pay">{t.paidUnpaidPreference}</label>
                <select
                  className="req-input"
                  id="rq-pay"
                  name="payPreference"
                  required
                  defaultValue=""
                >
                  <option value="" disabled>
                    {t.selectPreference}
                  </option>
                  <option value="Paid only">{t.prefPaidOnly}</option>
                  <option value="Unpaid is fine">{t.prefUnpaidFine}</option>
                  <option value="No preference">{t.prefNoPreference}</option>
                </select>
              </div>
              <div className="req-field">
                <label htmlFor="rq-msg">{t.tellUsLabel}</label>
                <textarea
                  className="req-input"
                  id="rq-msg"
                  name="message"
                  placeholder={t.tellUsPlaceholder}
                />
              </div>
              {error ? <p className="req-error">{error}</p> : null}
              <button type="submit" className="req-submit" disabled={isPending}>
                {isPending ? t.submitting : t.submitRequest}
              </button>
            </form>
          </div>
        ) : (
          <div className="req-success show">
            <div className="req-success-icon">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2D6A4F"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <path d="M22 4L12 14.01l-3-3" />
              </svg>
            </div>
            <h4>{t.requestReceivedTitle}</h4>
            <p>{t.requestReceivedBody}</p>
          </div>
        )}
      </div>
    </div>
  );
}
