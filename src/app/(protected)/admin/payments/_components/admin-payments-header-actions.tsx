"use client";

import { createAdminStandalonePaymentLink } from "@/actions/admin-standalone-payments";
import { StandalonePaymentLinkDialog } from "@/components/payments/standalone-payment-link-dialog";
import type { StandalonePaymentLinkInput } from "@/lib/standalone-payment-types";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";

export function AdminPaymentsHeaderActions() {
  const pathname = usePathname() ?? "";
  const [isPending, startTransition] = useTransition();
  const [standalonePaymentOpen, setStandalonePaymentOpen] = useState(false);
  const [standalonePaymentError, setStandalonePaymentError] = useState<
    string | null
  >(null);
  const [standalonePayUrl, setStandalonePayUrl] = useState<string | null>(null);

  const isPaymentsPage = pathname.replace(/\/$/, "") === "/admin/payments";
  if (!isPaymentsPage) return null;

  function handleOpenStandalonePayment() {
    setStandalonePaymentError(null);
    setStandalonePayUrl(null);
    setStandalonePaymentOpen(true);
  }

  function handleGenerateStandalonePaymentLink(
    input: StandalonePaymentLinkInput,
  ) {
    setStandalonePaymentError(null);
    startTransition(async () => {
      const result = await createAdminStandalonePaymentLink(input);
      if (!result.ok) {
        setStandalonePaymentError(result.error);
        return;
      }
      setStandalonePayUrl(result.payUrl);
    });
  }

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-[10px]">
        <button
          type="button"
          onClick={handleOpenStandalonePayment}
          disabled={isPending}
          className="flex cursor-pointer items-center gap-[6px] rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-[7px] text-[12px] font-semibold text-white transition-all duration-150 hover:bg-[#1B4332] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Quick payment link
        </button>
      </div>

      <StandalonePaymentLinkDialog
        open={standalonePaymentOpen}
        onClose={() => {
          if (!isPending) {
            setStandalonePaymentOpen(false);
            setStandalonePayUrl(null);
            setStandalonePaymentError(null);
          }
        }}
        onGenerateLink={handleGenerateStandalonePaymentLink}
        isSubmitting={isPending}
        error={standalonePaymentError}
        generatedPayUrl={standalonePayUrl}
      />
    </>
  );
}
