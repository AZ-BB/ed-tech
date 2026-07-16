"use client";

import { useEffect, useState, type FormEvent } from "react";

const fontSerif = '"DM Serif Display", Georgia, serif' as const;

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C] disabled:cursor-not-allowed disabled:opacity-60";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

export type ActivateLeadPackageFormInput = {
  applicationId: number;
  amountAed: number;
  universitiesCount: number;
};

export type ActivateLeadPackageDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: ActivateLeadPackageFormInput) => void;
  isSubmitting: boolean;
  error: string | null;
  applicationId: number;
  studentName: string;
};

export function ActivateLeadPackageDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  error,
  applicationId,
  studentName,
}: ActivateLeadPackageDialogProps) {
  const [amount, setAmount] = useState("");
  const [universitiesCount, setUniversitiesCount] = useState("");

  const parsedUniversitiesCount = Number.parseInt(universitiesCount.trim(), 10);
  const universitiesCountValid =
    Number.isFinite(parsedUniversitiesCount) && parsedUniversitiesCount >= 1;

  const parsedAmount = Number.parseFloat(amount.trim());
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;

  const submitDisabled =
    !amountValid || !universitiesCountValid || isSubmitting;

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setUniversitiesCount("");
  }, [open]);

  if (!open) return null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitDisabled) return;
    onSubmit({
      applicationId,
      amountAed: parsedAmount,
      universitiesCount: parsedUniversitiesCount,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(15,30,20,0.45)] p-4"
      role="presentation"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="activate-lead-title"
        className="w-full max-w-[440px] overflow-hidden rounded-[14px] border border-[#ece9e4] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[#ece9e4] px-5 py-4">
          <h2
            id="activate-lead-title"
            className="text-[22px] tracking-[-0.01em] text-[#1a1a1a]"
            style={{ fontFamily: fontSerif }}
          >
            Activate package
          </h2>
          <p className="mt-1 text-[12.5px] text-[#6a6a6a]">
            Record a paid amount for {studentName} and move this lead to Paying
            Customers. No Stripe payment is created.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4">
          <div className="space-y-3.5">
            <div>
              <label htmlFor="activate-unis" className={labelClassName}>
                Number of universities
              </label>
              <input
                id="activate-unis"
                type="number"
                min={1}
                step={1}
                value={universitiesCount}
                disabled={isSubmitting}
                onChange={(event) => setUniversitiesCount(event.target.value)}
                className={inputClassName}
                placeholder=""
              />
            </div>

            <div>
              <label htmlFor="activate-amount" className={labelClassName}>
                Paid amount (AED)
              </label>
              <input
                id="activate-amount"
                type="number"
                min={0.01}
                step={0.01}
                value={amount}
                disabled={isSubmitting}
                onChange={(event) => setAmount(event.target.value)}
                className={inputClassName}
                placeholder=""
              />
            </div>
          </div>

          {error ? (
            <p
              className="mt-3 rounded-[8px] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-3.5 py-2 text-[12.5px] font-medium text-[#4a4a4a] transition-colors hover:bg-[#faf9f4] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitDisabled}
              className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-3.5 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Activating..." : "Activate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
