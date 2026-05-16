"use client";

import { createAmbassadorSpecificRequest } from "@/actions/ambassador-specific-requests";
import { useCallback, useEffect, useState } from "react";

const inputClass =
  "w-full rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-2 font-[family-name:var(--font-dm-sans)] text-[13px] text-[var(--text)] transition placeholder:text-[#bdbab5] focus:border-[var(--green-light)] focus:outline-none";

const inputErrorClass =
  "border-[#c84545] bg-[#fff8f8] focus:border-[#c84545]";

export type StudentContactDefaults = {
  fullName: string;
  email: string;
  phone: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  studentDefaults?: StudentContactDefaults;
};

type FieldErrors = {
  name?: string;
  email?: string;
  phone?: string;
  university?: string;
};

function buildDefaults(studentDefaults?: StudentContactDefaults) {
  return {
    name: studentDefaults?.fullName ?? "",
    email: studentDefaults?.email ?? "",
    phone: studentDefaults?.phone ?? "",
    university: "",
    major: "",
    notes: "",
  };
}

export function RequestSpecificAmbassadorModal({ open, onClose, studentDefaults }: Props) {
  const [view, setView] = useState<"form" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [university, setUniversity] = useState("");
  const [major, setMajor] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = useCallback(() => {
    const d = buildDefaults(studentDefaults);
    setName(d.name);
    setEmail(d.email);
    setPhone(d.phone);
    setUniversity(d.university);
    setMajor(d.major);
    setNotes(d.notes);
    setFieldErrors({});
    setSubmitError(null);
    setView("form");
    setLoading(false);
  }, [studentDefaults]);

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);

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

  const validate = useCallback((): boolean => {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = "Please enter your full name.";
    if (!email.trim()) errors.email = "Please enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }
    if (!phone.trim()) errors.phone = "Please enter a phone number.";
    if (!university.trim()) {
      errors.university = "Please tell us which university or ambassador you're looking for.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [name, email, phone, university]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleSubmit = useCallback(async () => {
    setSubmitError(null);
    if (!validate()) return;

    setLoading(true);
    const result = await createAmbassadorSpecificRequest({
      studentName: name.trim(),
      studentEmail: email.trim(),
      studentPhone: phone.trim(),
      targetUniversity: university.trim(),
      preferredMajor: major.trim() || null,
      additionalNotes: notes.trim() || null,
    });
    setLoading(false);

    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }
    setView("success");
  }, [validate, name, email, phone, university, major, notes]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-6 sm:items-center sm:py-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal
        aria-labelledby="req-amb-title"
        className="relative my-auto flex max-h-[min(88vh,600px)] w-full max-w-[460px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_32px_rgba(0,0,0,0.14)]"
      >
        <button
          type="button"
          className="absolute right-3 top-3 z-[5] flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-white/90 transition hover:bg-white"
          onClick={handleClose}
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {view === "form" ? (
          <>
            <div className="shrink-0 border-b border-[var(--border-light)] bg-[var(--green-pale)] px-5 pb-4 pt-5 pr-11">
              <p className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[var(--green)]">
                Ambassador Request
              </p>
              <h2
                id="req-amb-title"
                className="mt-1.5 font-[family-name:var(--font-dm-serif)] text-xl leading-tight text-[var(--text)]"
              >
                Request a Specific Ambassador
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-mid)]">
                Looking for someone from a specific university, country, major, or background? Submit your request and our
                team will do our best to match you. Availability is not guaranteed.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              <div className="mb-3">
                <label className="mb-1 block text-xs font-semibold text-[var(--text)]" htmlFor="req-name">
                  Full Name
                  <span className="ml-0.5 text-[var(--green)]">*</span>
                </label>
                <input
                  id="req-name"
                  type="text"
                  className={`${inputClass} ${fieldErrors.name ? inputErrorClass : ""}`}
                  placeholder="Your full name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {fieldErrors.name ? (
                  <p className="mt-1 text-[11.5px] font-medium text-[#c84545]">{fieldErrors.name}</p>
                ) : null}
              </div>

              <div className="mb-3">
                <label className="mb-1 block text-xs font-semibold text-[var(--text)]" htmlFor="req-email">
                  Email Address
                  <span className="ml-0.5 text-[var(--green)]">*</span>
                </label>
                <input
                  id="req-email"
                  type="email"
                  className={`${inputClass} ${fieldErrors.email ? inputErrorClass : ""}`}
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {fieldErrors.email ? (
                  <p className="mt-1 text-[11.5px] font-medium text-[#c84545]">{fieldErrors.email}</p>
                ) : null}
              </div>

              <div className="mb-3">
                <label className="mb-1 block text-xs font-semibold text-[var(--text)]" htmlFor="req-phone">
                  Phone Number
                  <span className="ml-0.5 text-[var(--green)]">*</span>
                </label>
                <input
                  id="req-phone"
                  type="tel"
                  className={`${inputClass} ${fieldErrors.phone ? inputErrorClass : ""}`}
                  placeholder="+971 50 123 4567"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                {fieldErrors.phone ? (
                  <p className="mt-1 text-[11.5px] font-medium text-[#c84545]">{fieldErrors.phone}</p>
                ) : null}
              </div>

              <div className="mb-3">
                <label className="mb-1 block text-xs font-semibold text-[var(--text)]" htmlFor="req-uni">
                  University Ambassador You Are Looking For
                  <span className="ml-0.5 text-[var(--green)]">*</span>
                </label>
                <input
                  id="req-uni"
                  type="text"
                  className={`${inputClass} ${fieldErrors.university ? inputErrorClass : ""}`}
                  placeholder="e.g., University of Manchester, NYU Abu Dhabi, University of Toronto"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                />
                {fieldErrors.university ? (
                  <p className="mt-1 text-[11.5px] font-medium text-[#c84545]">{fieldErrors.university}</p>
                ) : null}
              </div>

              <div className="mb-3">
                <label className="mb-1 block text-xs font-semibold text-[var(--text)]" htmlFor="req-major">
                  Preferred Major / Area of Study
                  <span className="ml-1 text-[11.5px] font-medium text-[var(--text-hint)]">(optional)</span>
                </label>
                <input
                  id="req-major"
                  type="text"
                  className={inputClass}
                  placeholder="e.g., Computer Science, Business, Medicine, Engineering"
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className="mb-1 block text-xs font-semibold text-[var(--text)]" htmlFor="req-notes">
                  Anything Else We Should Know?
                  <span className="ml-1 text-[11.5px] font-medium text-[var(--text-hint)]">(optional)</span>
                </label>
                <textarea
                  id="req-notes"
                  className={`${inputClass} min-h-[72px] resize-y leading-normal`}
                  placeholder="Tell us about the type of student you want to speak to, your target country, questions you have, or any specific background you are looking for."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <p className="my-3 rounded-lg bg-[var(--sand)] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--text-light)]">
                We will do our best to find an ambassador who matches your criteria. Submitting this request does not
                guarantee availability or a confirmed session.
              </p>

              {submitError ? (
                <p className="mb-2 text-[13px] font-medium text-[#c84545]" role="alert">
                  {submitError}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border-light)] bg-white px-5 py-3.5 max-sm:flex-col-reverse">
              <button
                type="button"
                className="cursor-pointer rounded-[50px] border-[1.5px] border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--text-mid)] transition hover:border-[var(--text-light)] hover:text-[var(--text)] max-sm:w-full max-sm:justify-center"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[50px] bg-[var(--green)] px-5 py-2 text-xs font-semibold text-white shadow-[0_2px_8px_rgba(45,106,79,0.18)] transition hover:bg-[var(--green-dark)] disabled:cursor-not-allowed disabled:opacity-60 max-sm:w-full max-sm:justify-center"
                onClick={() => void handleSubmit()}
                disabled={loading}
              >
                {loading ? "Submitting…" : "Submit Request"}
                {!loading ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                ) : null}
              </button>
            </div>
          </>
        ) : (
          <div className="overflow-y-auto px-5 py-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--green-bg)] text-[var(--green)]">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="font-[family-name:var(--font-dm-serif)] text-xl leading-tight text-[var(--text)]">
              Request Submitted
            </h3>
            <p className="mx-auto mt-2 max-w-[360px] text-[13px] leading-relaxed text-[var(--text-mid)]">
              Thank you for submitting your ambassador request. Our team will review your criteria and do our best to find
              someone who matches what you are looking for. We will contact you once we are able to confirm availability.
              Please note that a match is not guaranteed.
            </p>
            <button
              type="button"
              className="mt-5 inline-flex cursor-pointer items-center rounded-[50px] bg-[var(--green)] px-6 py-2 text-xs font-semibold text-white transition hover:bg-[var(--green-dark)]"
              onClick={handleClose}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
