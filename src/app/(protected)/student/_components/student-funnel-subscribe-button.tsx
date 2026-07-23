"use client";

import { createFunnelSubscriptionCheckoutAction } from "@/actions/student-subscription";
import { useLocale } from "@/lib/i18n/locale-context";
import { useState, useTransition } from "react";

function btnPrimaryClass() {
  return [
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border-none",
    "bg-[var(--green)] px-6 py-2.5 text-[13px] font-semibold text-white transition-all",
    "font-[family-name:var(--font-dm-sans)] hover:bg-[var(--green-dark)] hover:-translate-y-px",
    "disabled:cursor-not-allowed disabled:opacity-55",
  ].join(" ");
}

export function StudentFunnelSubscribeButton({
  className,
  onError,
  label,
  buttonClassName,
}: {
  className?: string;
  onError?: (message: string) => void;
  label?: string;
  buttonClassName?: string;
}) {
  const { dict } = useLocale();
  const copy = dict.student.subscription;
  const [pending, startTransition] = useTransition();
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubscribe() {
    setLocalError(null);
    startTransition(async () => {
      const result = await createFunnelSubscriptionCheckoutAction();
      if (result.error || !result.data?.url) {
        const message = result.error ?? copy.checkoutFailed;
        setLocalError(message);
        onError?.(message);
        return;
      }
      window.location.href = result.data.url;
    });
  }

  return (
    <div className={className}>
      <button
        type="button"
        className={buttonClassName ?? btnPrimaryClass()}
        disabled={pending}
        onClick={handleSubscribe}
      >
        {pending ? copy.subscribing : (label ?? copy.subscribe)}
        {!pending && label ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden
          >
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        ) : null}
      </button>
      {localError ? (
        <p className="mt-2 text-xs font-medium text-[#E74C3C]">{localError}</p>
      ) : null}
    </div>
  );
}
