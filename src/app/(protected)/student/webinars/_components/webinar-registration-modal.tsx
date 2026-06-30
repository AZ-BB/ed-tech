"use client";

import { registerForWebinar } from "@/actions/student-webinars";
import { registerForWebinarAsGuest } from "@/actions/public-webinars";
import { useLocale } from "@/lib/i18n/locale-context";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { StudentWebinarCard } from "../_lib/fetch-student-webinars";
import { ArrowForwardIcon } from "../../_components/directional-icons";
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
  const { dict } = useLocale();
  const w = dict.webinars;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center overflow-y-auto bg-[rgba(26,26,26,0.55)] p-3 backdrop-blur-[4px] sm:items-center sm:p-5"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        className={`relative my-auto w-full min-w-0 max-w-[480px] rounded-[16px] bg-white p-5 sm:rounded-[20px] sm:p-8 ${fontSans}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)]"
          aria-label={w.close}
        >
          ✕
        </button>

        {success ? (
          <div className="py-5 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--green-pale)] text-[var(--green)]">
              ✓
            </div>
            <h3 className={`mb-2.5 ${fontSerif} text-[22px] leading-[1.2]`}>{w.registeredSuccess}</h3>
            <p className="mb-5 text-[13.5px] leading-[1.6] text-[var(--text-mid)]">
              {w.registeredSuccessHint}
            </p>
            <button
              type="button"
              onClick={onClose}
              className={`inline-flex w-full items-center justify-center rounded-full bg-[var(--green)] px-5 py-3.5 text-[14px] font-bold text-white ${fontSans}`}
            >
              {w.gotIt}
            </button>
          </div>
        ) : (
          <>
            <p className={`mb-2 text-[11px] font-bold uppercase tracking-[1.2px] text-[var(--green)] ${fontSans}`}>
              {w.registerForWebinar}
            </p>
            <h3 className={`mb-3.5 break-words ${fontSerif} text-[19px] leading-[1.2] sm:text-[22px]`}>{webinar.title}</h3>
            <div className="mb-[18px] flex flex-col gap-1.5 rounded-[11px] bg-[var(--sand)] p-3.5 text-[12.5px] leading-normal text-[var(--text-mid)]">
              <span>{formatWebinarDate(webinar.scheduledAt)}</span>
              <span>
                {formatWebinarTime(webinar.scheduledAt)} {webinar.timezoneLabel}
              </span>
              <span>{webinar.speakerName}</span>
            </div>
            <p className="mb-[18px] text-[13px] leading-[1.5] text-[var(--text-mid)]">
              {isPublic ? w.registerPublicHint : w.registerStudentHint}
            </p>
            {isPublic ? (
              <div className="mb-[18px] flex flex-col gap-3">
                <div>
                  <label
                    htmlFor="webinar-guest-name"
                    className="mb-1 block text-[12px] font-semibold text-[var(--text)]"
                  >
                    {w.fullName}
                  </label>
                  <input
                    id="webinar-guest-name"
                    type="text"
                    autoComplete="name"
                    value={guestName}
                    onChange={(e) => onGuestNameChange(e.target.value)}
                    placeholder={w.fullNamePlaceholder}
                    required
                    disabled={isSubmitting}
                    className="box-border w-full min-w-0 max-w-full rounded-[10px] border border-[var(--border)] px-3.5 py-2.5 text-[13px] outline-none focus:border-[var(--green)]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="webinar-guest-email"
                    className="mb-1 block text-[12px] font-semibold text-[var(--text)]"
                  >
                    {w.emailAddress}
                  </label>
                  <input
                    id="webinar-guest-email"
                    type="email"
                    autoComplete="email"
                    value={guestEmail}
                    onChange={(e) => onGuestEmailChange(e.target.value)}
                    placeholder={w.emailPlaceholder}
                    required
                    disabled={isSubmitting}
                    className="box-border w-full min-w-0 max-w-full rounded-[10px] border border-[var(--border)] px-3.5 py-2.5 text-[13px] outline-none focus:border-[var(--green)]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="webinar-guest-phone"
                    className="mb-1 block text-[12px] font-semibold text-[var(--text)]"
                  >
                    {w.phoneNumber}{" "}
                    <span className="font-normal text-[var(--text-light)]">{w.phoneOptional}</span>
                  </label>
                  <input
                    id="webinar-guest-phone"
                    type="tel"
                    autoComplete="tel"
                    value={guestPhone}
                    onChange={(e) => onGuestPhoneChange(e.target.value)}
                    placeholder={w.phonePlaceholder}
                    disabled={isSubmitting}
                    className="box-border w-full min-w-0 max-w-full rounded-[10px] border border-[var(--border)] px-3.5 py-2.5 text-[13px] outline-none focus:border-[var(--green)]"
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
              {isSubmitting ? w.registering : w.confirmRegistration}
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
  const { dict } = useLocale();
  const w = dict.webinars;

  if (webinar.isRegistered) {
    return (
      <button type="button" disabled className={`${className} opacity-70`}>
        {w.registered}
      </button>
    );
  }
  if (webinar.isFull) {
    return (
      <button type="button" disabled className={`${className} opacity-70`}>
        {w.full}
      </button>
    );
  }
  return (
    <button type="button" onClick={() => onRegister(webinar)} className={className}>
      {w.registerNow}
      <ArrowForwardIcon size={13} />
    </button>
  );
}
