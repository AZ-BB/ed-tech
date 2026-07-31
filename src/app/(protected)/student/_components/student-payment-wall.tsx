"use client";

import {
  confirmIndividualSignupPaymentAction,
  createIndividualSignupCheckoutAction,
} from "@/actions/individual-signup-payment";
import { logout } from "@/actions/auth";
import { useLocale } from "@/lib/i18n/locale-context";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export function StudentPaymentWall() {
  const { dict } = useLocale();
  const copy = dict.student.signupPayment;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [payPending, startPayTransition] = useTransition();
  const [confirmPending, startConfirmTransition] = useTransition();
  const [logoutPending, startLogoutTransition] = useTransition();
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);

  const sessionId = searchParams.get("signup_session_id")?.trim() ?? "";
  const paymentCanceled = searchParams.get("signup_payment") === "canceled";

  useEffect(() => {
    if (paymentCanceled) {
      setLocalError(copy.canceledMessage);
    }
  }, [paymentCanceled, copy.canceledMessage]);

  useEffect(() => {
    if (!sessionId) return;

    setLocalError(null);
    setConfirmMessage(copy.confirming);
    startConfirmTransition(async () => {
      const result = await confirmIndividualSignupPaymentAction(sessionId);
      if (result.error || !result.data) {
        setConfirmMessage(null);
        setLocalError(result.error ?? copy.confirmFailed);
        return;
      }
      router.replace("/student");
      router.refresh();
    });
  }, [sessionId, copy.confirmFailed, copy.confirming, router]);

  function handlePay() {
    setLocalError(null);
    startPayTransition(async () => {
      const result = await createIndividualSignupCheckoutAction();
      if (result.error || !result.data?.url) {
        setLocalError(result.error ?? copy.checkoutFailed);
        return;
      }
      window.location.href = result.data.url;
    });
  }

  function handleLogout() {
    startLogoutTransition(() => {
      void logout();
    });
  }

  const isBusy = payPending || confirmPending || logoutPending || Boolean(sessionId);

  return (
    <div className="student-portal flex min-h-screen items-center justify-center bg-[var(--sand)] px-4 py-10 font-[family-name:var(--font-dm-sans)]">
      <div className="w-full max-w-[560px] rounded-[20px] bg-white px-8 py-10 shadow-[0_20px_60px_rgba(10,20,14,0.12)] max-[640px]:px-5 max-[640px]:py-8">
        <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-[13px] bg-[var(--green-bg)]">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2D6A4F"
            strokeWidth="1.8"
            aria-hidden
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>

        <span className="mb-2 inline-block text-[10.5px] font-bold uppercase tracking-[1.2px] text-[var(--green)]">
          {copy.eyebrow}
        </span>
        <h1 className="mb-2.5 font-[family-name:var(--font-dm-serif)] text-[26px] leading-tight text-[var(--text)] max-[640px]:text-[22px]">
          {copy.title}
        </h1>
        <p className="mb-[18px] text-[13.5px] leading-relaxed text-[var(--text-mid)]">
          {copy.body}
        </p>

        <ul className="mb-[22px] flex list-none flex-col gap-2.5 p-0">
          {copy.benefits.map((benefit) => (
            <li
              key={benefit}
              className="flex items-start gap-2.5 text-[13px] leading-snug text-[var(--text-mid)]"
            >
              <span className="mt-px flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)]">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2D6A4F"
                  strokeWidth="3"
                  aria-hidden
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
              {benefit}
            </li>
          ))}
        </ul>

        {confirmMessage ? (
          <p className="mb-4 text-center text-sm font-medium text-[var(--green-dark)]">
            {confirmMessage}
          </p>
        ) : null}

        {localError ? (
          <p className="mb-4 text-center text-sm font-medium text-[#E74C3C]">{localError}</p>
        ) : null}

        <button
          type="button"
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-[var(--green)] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--green-dark)] hover:shadow-[0_6px_18px_rgba(27,67,50,0.22)] disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isBusy}
          onClick={handlePay}
        >
          {payPending || confirmPending ? copy.paying : copy.cta}
        </button>

        <button
          type="button"
          className="mt-4 block w-full cursor-pointer border-none bg-transparent p-2 text-center text-[12.5px] font-semibold text-[var(--text-light)] transition hover:text-[var(--green-dark)] hover:underline disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isBusy}
          onClick={handleLogout}
        >
          {logoutPending ? copy.loggingOut : copy.logOut}
        </button>

        <p className="mt-2.5 text-center text-[11px] text-[var(--text-hint)]">
          {copy.reassure}
        </p>
      </div>
    </div>
  );
}
