"use client";

import {
  confirmIndividualSignupPaymentAction,
  createIndividualSignupCheckoutAction,
} from "@/actions/individual-signup-payment";
import { logout } from "@/actions/auth";
import { useLocale } from "@/lib/i18n/locale-context";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-[11px] w-[11px] stroke-[#2C4433] stroke-[3]"
    >
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  );
}

export function StudentPaymentWall({ displayPrice }: { displayPrice: string }) {
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
  const ctaLabel = copy.cta.replace("{price}", displayPrice);

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
    <div className="student-portal flex min-h-screen items-center justify-center bg-[#F2F1EA] px-5 py-9 font-[family-name:var(--font-dm-sans)] max-[560px]:items-start max-[560px]:px-2 max-[560px]:py-2.5">
      <main className="w-full max-w-[620px] rounded-[22px] bg-white px-14 pb-10 pt-[52px] shadow-[0_24px_64px_rgba(44,68,51,0.09)] max-[560px]:rounded-[18px] max-[560px]:px-[22px] max-[560px]:pb-[30px] max-[560px]:pt-9">
        <header className="text-center">
          <p className="mb-[22px] text-[11.5px] font-bold uppercase tracking-[0.2em] text-[#3D5A44] max-[560px]:mb-4">
            {copy.eyebrow}
          </p>
          <p className="font-[family-name:var(--font-dm-serif)] text-[72px] leading-none text-[#2C4433] max-[560px]:text-[56px]">
            {displayPrice}
          </p>
          <p className="mt-[13px] text-sm tracking-[0.02em] text-[#6A7466] max-[560px]:text-[13px]">
            <b className="font-semibold text-[#22301F]">{copy.priceSubOneTime}</b>
            <span className="mx-[7px] text-[#C9A85C]">·</span>
            {copy.priceSubNoSubscription}
            <span className="mx-[7px] text-[#C9A85C]">·</span>
            {copy.priceSubInstant}
          </p>
          <hr className="mx-auto my-[26px] h-0.5 w-11 border-0 bg-[#C9A85C] max-[560px]:my-[22px]" />
        </header>

        <h1 className="mb-2 text-center font-[family-name:var(--font-dm-serif)] text-[23px] font-normal leading-[1.3] text-[#22301F] max-[560px]:text-xl">
          {copy.title}
        </h1>
        <p className="mb-8 text-center text-[14.5px] leading-[1.55] text-[#6A7466] max-[560px]:mb-[26px] max-[560px]:text-[13.5px]">
          {copy.body}
        </p>

        <table className="mb-[30px] w-full border-collapse">
          <caption className="caption-top border-b border-[#2C4433] pb-[11px] text-start text-[11px] font-bold uppercase tracking-[0.18em] text-[#A8863D]">
            {copy.inclusionsCaption}
          </caption>
          <tbody>
            {copy.inclusions.map((item, index) => (
              <tr
                key={item.title}
                className={
                  index === copy.inclusions.length - 1
                    ? "[&_td]:border-b [&_td]:border-[#2C4433]"
                    : ""
                }
              >
                <td className="border-b border-[#EAE8DE] py-3.5 pe-[18px] align-top max-[560px]:py-3">
                  <strong className="mb-0.5 flex flex-wrap items-center gap-2 text-[15px] font-semibold max-[560px]:text-[14.5px]">
                    {item.title}
                    {"badge" in item && item.badge ? (
                      <span className="rounded-full border border-[#C9A85C] px-2 py-[3px] text-[9.5px] font-bold uppercase leading-none tracking-[0.12em] text-[#A8863D]">
                        {item.badge}
                      </span>
                    ) : null}
                  </strong>
                  <span className="block text-[13px] leading-[1.45] text-[#6A7466] max-[560px]:text-[12.5px]">
                    {item.description}
                  </span>
                </td>
                <td className="w-[34px] border-b border-[#EAE8DE] py-3.5 text-end align-top max-[560px]:py-3">
                  <span className="inline-flex h-[23px] w-[23px] items-center justify-center rounded-full bg-[#E8EFE9]">
                    <CheckIcon />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {confirmMessage ? (
          <p className="mb-4 text-center text-sm font-medium text-[#2C4433]">
            {confirmMessage}
          </p>
        ) : null}

        {localError ? (
          <p className="mb-4 text-center text-sm font-medium text-[#E74C3C]">{localError}</p>
        ) : null}

        <button
          type="button"
          className="block w-full cursor-pointer rounded-[13px] border-none bg-[#2C4433] px-6 py-[18px] text-center text-base font-semibold tracking-[0.01em] text-[#FDFCF7] transition hover:bg-[#3D5A44] hover:shadow-[0_12px_28px_rgba(44,68,51,0.28)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#C9A85C] focus-visible:outline-offset-3 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none"
          disabled={isBusy}
          onClick={handlePay}
        >
          {payPending || confirmPending ? copy.paying : ctaLabel}
        </button>

        <div className="mt-[15px] flex flex-wrap justify-center gap-5 text-[12.5px] text-[#6A7466] max-[560px]:gap-3 max-[560px]:text-xs">
          <span className="inline-flex items-center gap-1.5">
            <CheckIcon />
            {copy.assureOneTime}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckIcon />
            {copy.assureStripe}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckIcon />
            {copy.assureInstant}
          </span>
        </div>

        <p className="mt-3 text-center text-xs text-[#9AA396]">{copy.stripeLine}</p>

        <button
          type="button"
          className="mt-4 block w-full cursor-pointer border-none bg-transparent p-2 text-center text-sm text-[#6A7466] transition hover:text-[#22301F] hover:underline focus-visible:rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3D5A44] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isBusy}
          onClick={handleLogout}
        >
          {logoutPending ? copy.loggingOut : copy.logOut}
        </button>
      </main>
    </div>
  );
}
