"use client";

import type { StandalonePaymentLinkInput } from "@/lib/standalone-payment-types";
import { preventNumberInputWheelScroll } from "@/lib/prevent-number-input-wheel";
import { Check, Copy } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

const fontSerif = '"DM Serif Display", Georgia, serif' as const;

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C] disabled:cursor-not-allowed disabled:opacity-60";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

export type StandalonePaymentLinkDialogProps = {
  open: boolean;
  onClose: () => void;
  isSubmitting: boolean;
  error: string | null;
  generatedPayUrl: string | null;
  onGenerateLink: (input: StandalonePaymentLinkInput) => void;
};

export function StandalonePaymentLinkDialog({
  open,
  onClose,
  isSubmitting,
  error,
  generatedPayUrl,
  onGenerateLink,
}: StandalonePaymentLinkDialogProps) {
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(false);

  const parsedAmount = Number.parseFloat(amount.trim());
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setCopied(false);
  }, [open]);

  if (!open) return null;

  async function handleCopy() {
    if (!generatedPayUrl) return;
    try {
      await navigator.clipboard.writeText(generatedPayUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!amountValid || isSubmitting) return;
    onGenerateLink({ amountAed: parsedAmount });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="standalone-payment-link-title"
        className="w-full max-w-md overflow-hidden rounded-[14px] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[#e8e6e1] px-5 py-4">
          <h2
            id="standalone-payment-link-title"
            className="text-[17px] font-normal tracking-tight text-[#1a1a1a]"
            style={{ fontFamily: fontSerif }}
          >
            Quick payment link
          </h2>
          <p className="mt-1 text-[12.5px] text-[#6a6a6a]">
            Generate a shareable payment link for any amount. Not linked to a
            student or application.
          </p>
        </div>

        <div className="px-5 py-4">
          {generatedPayUrl ? (
            <div className="space-y-3.5">
              <p className="text-[13px] text-[#4a4a4a]">
                Payment link created. Share it with the payer. They can pay on
                your custom checkout page.
              </p>
              <div>
                <label htmlFor="standalone-pay-url" className={labelClassName}>
                  Payment link
                </label>
                <div className="flex gap-2">
                  <input
                    id="standalone-pay-url"
                    type="text"
                    readOnly
                    value={generatedPayUrl}
                    className={inputClassName}
                  />
                  <button
                    type="button"
                    onClick={() => void handleCopy()}
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-3 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" aria-hidden />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" aria-hidden />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-3.5 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label htmlFor="standalone-link-amount" className={labelClassName}>
                  Amount (AED)
                </label>
                <input
                  id="standalone-link-amount"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={amount}
                  disabled={isSubmitting}
                  onChange={(event) => setAmount(event.target.value)}
                  onWheel={preventNumberInputWheelScroll}
                  className={inputClassName}
                  placeholder="e.g. 500"
                  autoFocus
                />
              </div>

              {error ? (
                <p className="text-[12.5px] text-[#E74C3C]" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={onClose}
                  className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#4a4a4a] transition-colors hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!amountValid || isSubmitting}
                  className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-3.5 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Generating…" : "Generate link"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
