"use client";

import { preventNumberInputWheelScroll } from "@/lib/prevent-number-input-wheel";
import { useEffect, useMemo, useState, type FormEvent } from "react";

const fontSerif = '"DM Serif Display", Georgia, serif' as const;

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22 viewBox=%220 0 10 6%22 fill=%22none%22%3E%3Cpath d=%22M1 1l4 4 4-4%22 stroke=%22%236a6a6a%22 stroke-width=%221.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/%3E%3C/svg%3E")';

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C] disabled:cursor-not-allowed disabled:opacity-60";

const selectClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none appearance-none bg-[length:10px_6px] bg-[position:right_12px_center] bg-no-repeat pr-9 transition-colors focus:border-[#40916C] disabled:cursor-not-allowed disabled:opacity-60";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

export type ManualPaymentApplicationOption = {
  applicationId: number;
  studentName: string;
  label: string;
  status: string;
  universitiesTotal: number;
};

export type AddManualPaymentFormInput = {
  applicationId: number;
  amountAed: number;
  universitiesCount?: number;
};

export type AddManualPaymentDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: AddManualPaymentFormInput) => void;
  isSubmitting: boolean;
  error: string | null;
  applicationOptions: ManualPaymentApplicationOption[];
};

function statusBadgeLabel(status: string): string {
  if (status === "active_package") return "Paying customer";
  if (status === "payment_requested") return "Payment requested";
  if (status === "intake_draft") return "Intake draft";
  return "Lead";
}

export function AddManualPaymentDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  error,
  applicationOptions,
}: AddManualPaymentDialogProps) {
  const [selectedApplicationId, setSelectedApplicationId] = useState("");
  const [amount, setAmount] = useState("");
  const [universitiesCount, setUniversitiesCount] = useState("");

  const selected = useMemo(() => {
    const id = Number.parseInt(selectedApplicationId, 10);
    if (!Number.isFinite(id)) return null;
    return applicationOptions.find((option) => option.applicationId === id) ?? null;
  }, [applicationOptions, selectedApplicationId]);

  const isActivePackage = selected?.status === "active_package";
  const needsUniversities = selected != null && !isActivePackage;

  const parsedAmount = Number.parseFloat(amount.trim());
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;

  const parsedUniversitiesCount = Number.parseInt(universitiesCount.trim(), 10);
  const universitiesCountValid =
    !needsUniversities ||
    (Number.isFinite(parsedUniversitiesCount) && parsedUniversitiesCount >= 1);

  const submitDisabled =
    !selected || !amountValid || !universitiesCountValid || isSubmitting;

  useEffect(() => {
    if (!open) return;
    setSelectedApplicationId("");
    setAmount("");
    setUniversitiesCount("");
  }, [open]);

  useEffect(() => {
    if (!selected) {
      setUniversitiesCount("");
      return;
    }
    if (selected.status === "active_package") {
      setUniversitiesCount("");
      return;
    }
    setUniversitiesCount(
      selected.universitiesTotal >= 1 ? String(selected.universitiesTotal) : "",
    );
  }, [selected]);

  if (!open) return null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitDisabled || !selected) return;
    onSubmit({
      applicationId: selected.applicationId,
      amountAed: parsedAmount,
      ...(needsUniversities
        ? { universitiesCount: parsedUniversitiesCount }
        : {}),
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
        aria-labelledby="add-manual-payment-title"
        className="w-full max-w-[460px] overflow-hidden rounded-[14px] border border-[#ece9e4] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[#ece9e4] px-5 py-4">
          <h2
            id="add-manual-payment-title"
            className="text-[22px] tracking-[-0.01em] text-[#1a1a1a]"
            style={{ fontFamily: fontSerif }}
          >
            Add manual payment
          </h2>
          <p className="mt-1 text-[12.5px] text-[#6a6a6a]">
            Record a paid amount for a lead or paying customer. Selecting a lead
            activates their package automatically.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4">
          <div className="space-y-3.5">
            <div>
              <label htmlFor="manual-payment-application" className={labelClassName}>
                Lead or application
              </label>
              <select
                id="manual-payment-application"
                value={selectedApplicationId}
                disabled={isSubmitting || applicationOptions.length === 0}
                onChange={(event) => setSelectedApplicationId(event.target.value)}
                className={selectClassName}
                style={{ backgroundImage: SELECT_CHEVRON }}
              >
                <option value="">Select a lead or application…</option>
                {applicationOptions.map((option) => (
                  <option key={option.applicationId} value={option.applicationId}>
                    {option.label} ({statusBadgeLabel(option.status)})
                  </option>
                ))}
              </select>
              {applicationOptions.length === 0 ? (
                <p className="mt-1.5 text-[11.5px] text-[#a0a0a0]">
                  No assigned leads or applications available.
                </p>
              ) : null}
            </div>

            {needsUniversities ? (
              <div>
                <label htmlFor="manual-payment-unis" className={labelClassName}>
                  Package universities
                </label>
                <input
                  id="manual-payment-unis"
                  type="number"
                  min={1}
                  step={1}
                  value={universitiesCount}
                  disabled={isSubmitting}
                  onChange={(event) => setUniversitiesCount(event.target.value)}
                  onWheel={preventNumberInputWheelScroll}
                  className={inputClassName}
                  placeholder="e.g. 5"
                />
                <p className="mt-1.5 text-[11.5px] text-[#a0a0a0]">
                  This lead will be marked as an active package with this university
                  count.
                </p>
              </div>
            ) : null}

            <div>
              <label htmlFor="manual-payment-amount" className={labelClassName}>
                Paid amount (AED)
              </label>
              <input
                id="manual-payment-amount"
                type="number"
                min={0.01}
                step={0.01}
                value={amount}
                disabled={isSubmitting}
                onChange={(event) => setAmount(event.target.value)}
                onWheel={preventNumberInputWheelScroll}
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
              {isSubmitting ? "Saving..." : "Record payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
