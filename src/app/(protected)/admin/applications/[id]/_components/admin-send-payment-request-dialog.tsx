"use client";

import { useEffect, useState } from "react";

type AdminSendPaymentRequestDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (amountAed: number) => void;
  isSubmitting: boolean;
  error: string | null;
  planPrice: number;
  totalPaid: number;
  studentEmail: string;
};

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

export function AdminSendPaymentRequestDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  error,
  planPrice,
  totalPaid,
  studentEmail,
}: AdminSendPaymentRequestDialogProps) {
  const remainingBalance = Math.max(0, planPrice - totalPaid);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (!open) return;
    setAmount("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, isSubmitting]);

  if (!open) return null;

  function handleFillFullPrice() {
    const fillAmount = remainingBalance > 0 ? remainingBalance : planPrice;
    if (fillAmount <= 0) return;
    setAmount(String(fillAmount));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = Number.parseFloat(amount.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    onSubmit(parsed);
  }

  const parsedAmount = Number.parseFloat(amount.trim());
  const amountValid =
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    (remainingBalance <= 0 || parsedAmount <= remainingBalance);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={isSubmitting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-send-payment-request-title"
        className="w-full max-w-md rounded-[12px] border border-[#e0deda] bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="admin-send-payment-request-title"
          className="text-[18px] font-semibold text-[#1a1a1a]"
        >
          Send payment request
        </h2>
        <p className="mt-2 text-[13px] text-[#666]">
          Specify how much the student will pay. An email with a secure checkout link will be sent
          to <span className="font-medium text-[#1a1a1a]">{studentEmail}</span>.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 rounded-[10px] border border-[var(--border-light)] bg-[#faf9f4] p-3 text-[12px]">
          <div>
            <div className="font-semibold uppercase tracking-[0.04em] text-[var(--text-light)]">
              Package price
            </div>
            <div className="mt-0.5 font-medium text-[var(--text)]">
              {planPrice.toLocaleString()} AED
            </div>
          </div>
          <div>
            <div className="font-semibold uppercase tracking-[0.04em] text-[var(--text-light)]">
              Already paid
            </div>
            <div className="mt-0.5 font-medium text-[var(--text)]">
              {totalPaid.toLocaleString()} AED
            </div>
          </div>
          <div className="col-span-2 border-t border-[var(--border-light)] pt-2">
            <div className="font-semibold uppercase tracking-[0.04em] text-[var(--text-light)]">
              Remaining balance
            </div>
            <div className="mt-0.5 text-[14px] font-semibold text-[var(--green-dark)]">
              {remainingBalance.toLocaleString()} AED
            </div>
          </div>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="payment-request-amount" className={labelClassName}>
              Amount (AED)
            </label>
            <div className="flex gap-2">
              <input
                id="payment-request-amount"
                type="number"
                min={1}
                max={remainingBalance > 0 ? remainingBalance : undefined}
                step="0.01"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Enter amount"
                className={inputClassName}
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={handleFillFullPrice}
                disabled={isSubmitting || (remainingBalance <= 0 && planPrice <= 0)}
                className="shrink-0 cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[11.5px] font-semibold text-[#4a4a4a] transition-colors hover:border-[#40916C] hover:text-[#2D6A4F] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {remainingBalance > 0
                  ? totalPaid > 0
                    ? "Fill remaining"
                    : "Full price"
                  : "Full price"}
              </button>
            </div>
            {amount.trim() !== "" && !amountValid ? (
              <p className="mt-1.5 text-[12px] text-[#E74C3C]">
                {remainingBalance > 0
                  ? `Enter an amount between 1 and ${remainingBalance.toLocaleString()} AED.`
                  : "Enter a valid amount greater than 0."}
              </p>
            ) : null}
          </div>

          {error ? (
            <p className="text-[12px] font-medium text-[#E74C3C]" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[13px] font-semibold text-[#4a4a4a] transition-colors hover:bg-[#faf9f4] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !amountValid}
              className="cursor-pointer rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Sending…" : "Send request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
