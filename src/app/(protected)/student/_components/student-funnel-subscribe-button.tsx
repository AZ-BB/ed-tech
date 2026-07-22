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
}: {
  className?: string;
  onError?: (message: string) => void;
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
        className={btnPrimaryClass()}
        disabled={pending}
        onClick={handleSubscribe}
      >
        {pending ? copy.subscribing : copy.subscribe}
      </button>
      {localError ? (
        <p className="mt-2 text-xs font-medium text-[#E74C3C]">{localError}</p>
      ) : null}
    </div>
  );
}
