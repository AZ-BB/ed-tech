"use client";

import { registerForWebinar } from "@/actions/student-webinars";
import { registerForWebinarAsGuest } from "@/actions/public-webinars";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { StudentWebinarCard } from "../_lib/fetch-student-webinars";
import { fontSans, fontSerif, type WebinarPageMode } from "./webinar-constants";
import { formatWebinarDate, formatWebinarTime } from "./webinar-format";

type UseWebinarRegistrationOptions = {
  mode: WebinarPageMode;
  onRegistered?: (webinarId: number) => void;
};

export function useWebinarRegistration({ mode, onRegistered }: UseWebinarRegistrationOptions) {
  const isPublic = mode === "public";
  const router = useRouter();
  const [modalWebinar, setModalWebinar] = useState<StudentWebinarCard | null>(null);
  const [modalSuccess, setModalSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  const closeModal = useCallback(() => {
    setModalWebinar(null);
    setModalSuccess(false);
    setModalError(null);
    setIsSubmitting(false);
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
  }, []);

  const openRegistration = useCallback((webinar: StudentWebinarCard) => {
    setModalWebinar(webinar);
    setModalSuccess(false);
    setModalError(null);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeModal();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeModal]);

  async function handleConfirmRegistration() {
    if (!modalWebinar) return;
    setIsSubmitting(true);
    setModalError(null);

    const result = isPublic
      ? await registerForWebinarAsGuest(modalWebinar.id, {
          name: guestName,
          email: guestEmail,
          phone: guestPhone || undefined,
        })
      : await registerForWebinar(modalWebinar.id);

    if (!result.ok) {
      setModalError(result.error);
      setIsSubmitting(false);
      return;
    }

    onRegistered?.(modalWebinar.id);
    setModalSuccess(true);
    setIsSubmitting(false);
    router.refresh();
  }

  return {
    modalWebinar,
    modalSuccess,
    isSubmitting,
    modalError,
    guestName,
    guestEmail,
    guestPhone,
    setGuestName,
    setGuestEmail,
    setGuestPhone,
    closeModal,
    openRegistration,
    handleConfirmRegistration,
    registrationModal: modalWebinar ? (
      <WebinarRegistrationModal
        webinar={modalWebinar}
        mode={mode}
        success={modalSuccess}
        isSubmitting={isSubmitting}
        error={modalError}
        guestName={guestName}
        guestEmail={guestEmail}
        guestPhone={guestPhone}
        onGuestNameChange={setGuestName}
        onGuestEmailChange={setGuestEmail}
        onGuestPhoneChange={setGuestPhone}
        onClose={closeModal}
        onConfirm={() => void handleConfirmRegistration()}
      />
    ) : null,
  };
}

type WebinarRegistrationModalProps = {
  webinar: StudentWebinarCard;
  mode: WebinarPageMode;
  success: boolean;
  isSubmitting: boolean;
  error: string | null;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  onGuestNameChange: (value: string) => void;
  onGuestEmailChange: (value: string) => void;
  onGuestPhoneChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function WebinarRegistrationModal({
  webinar,
  mode,
  success,
  isSubmitting,
  error,
  guestName,
  guestEmail,
  guestPhone,
  onGuestNameChange,
  onGuestEmailChange,
  onGuestPhoneChange,
  onClose,
  onConfirm,
}: WebinarRegistrationModalProps) {
  const isPublic = mode === "public";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(26,26,26,0.55)] p-5 backdrop-blur-[4px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        className={`relative w-full max-w-[480px] rounded-[20px] bg-white p-8 ${fontSans}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)]"
          aria-label="Close"
        >
          ✕
        </button>

        {success ? (
          <div className="py-5 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--green-pale)] text-[var(--green)]">
              ✓
            </div>
            <h3 className={`mb-2.5 ${fontSerif} text-[22px] leading-[1.2]`}>You&apos;re registered!</h3>
            <p className="mb-5 text-[13.5px] leading-[1.6] text-[var(--text-mid)]">
              We&apos;ll send you a reminder the day before the session, and the meeting link when it starts.
            </p>
            <button
              type="button"
              onClick={onClose}
              className={`inline-flex w-full items-center justify-center rounded-full bg-[var(--green)] px-5 py-3.5 text-[14px] font-bold text-white ${fontSans}`}
            >
              Got it
            </button>
          </div>
        ) : (
          <>
            <p className={`mb-2 text-[11px] font-bold uppercase tracking-[1.2px] text-[var(--green)] ${fontSans}`}>
              Register for webinar
            </p>
            <h3 className={`mb-3.5 ${fontSerif} text-[22px] leading-[1.2]`}>{webinar.title}</h3>
            <div className="mb-[18px] flex flex-col gap-1.5 rounded-[11px] bg-[var(--sand)] p-3.5 text-[12.5px] leading-normal text-[var(--text-mid)]">
              <span>{formatWebinarDate(webinar.scheduledAt)}</span>
              <span>
                {formatWebinarTime(webinar.scheduledAt)} {webinar.timezoneLabel}
              </span>
              <span>{webinar.speakerName}</span>
            </div>
            <p className="mb-[18px] text-[13px] leading-[1.5] text-[var(--text-mid)]">
              {isPublic
                ? "Enter your details to reserve your spot. We'll email you a reminder the day before and the meeting link when the session starts."
                : "Confirm your spot for this live session. No extra details needed — you're registering as your logged-in student account."}
            </p>
            {isPublic ? (
              <div className="mb-[18px] flex flex-col gap-3">
                <div>
                  <label
                    htmlFor="webinar-guest-name"
                    className="mb-1 block text-[12px] font-semibold text-[var(--text)]"
                  >
                    Full name
                  </label>
                  <input
                    id="webinar-guest-name"
                    type="text"
                    autoComplete="name"
                    value={guestName}
                    onChange={(e) => onGuestNameChange(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    disabled={isSubmitting}
                    className="w-full rounded-[10px] border border-[var(--border)] px-3.5 py-2.5 text-[13px] outline-none focus:border-[var(--green)]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="webinar-guest-email"
                    className="mb-1 block text-[12px] font-semibold text-[var(--text)]"
                  >
                    Email address
                  </label>
                  <input
                    id="webinar-guest-email"
                    type="email"
                    autoComplete="email"
                    value={guestEmail}
                    onChange={(e) => onGuestEmailChange(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={isSubmitting}
                    className="w-full rounded-[10px] border border-[var(--border)] px-3.5 py-2.5 text-[13px] outline-none focus:border-[var(--green)]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="webinar-guest-phone"
                    className="mb-1 block text-[12px] font-semibold text-[var(--text)]"
                  >
                    Phone number <span className="font-normal text-[var(--text-light)]">(optional)</span>
                  </label>
                  <input
                    id="webinar-guest-phone"
                    type="tel"
                    autoComplete="tel"
                    value={guestPhone}
                    onChange={(e) => onGuestPhoneChange(e.target.value)}
                    placeholder="Enter your phone number"
                    disabled={isSubmitting}
                    className="w-full rounded-[10px] border border-[var(--border)] px-3.5 py-2.5 text-[13px] outline-none focus:border-[var(--green)]"
                  />
                </div>
              </div>
            ) : null}
            {error ? (
              <p className="mb-4 rounded-[8px] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]">{error}</p>
            ) : null}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onConfirm}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--green)] px-5 py-3.5 text-[14px] font-bold text-white disabled:opacity-60 ${fontSans}`}
            >
              {isSubmitting ? "Registering…" : "Confirm registration"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function WebinarRegisterCta({
  webinar,
  className,
  onRegister,
}: {
  webinar: StudentWebinarCard;
  className: string;
  onRegister: (webinar: StudentWebinarCard) => void;
}) {
  if (webinar.isRegistered) {
    return (
      <button type="button" disabled className={`${className} opacity-70`}>
        Registered
      </button>
    );
  }
  if (webinar.isFull) {
    return (
      <button type="button" disabled className={`${className} opacity-70`}>
        Full
      </button>
    );
  }
  return (
    <button type="button" onClick={() => onRegister(webinar)} className={className}>
      Register now
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
        <path d="M5 12h14M13 5l7 7-7 7" />
      </svg>
    </button>
  );
}
