"use client";

import { useEffect, useState } from "react";
import { updateAdvisorApplicationSupportIntake } from "@/actions/advisor-application-support-intake";
import type { ApplicationSupportPayload } from "@/lib/application-support-intake";
import type { ApplicationPlanCatalogRow } from "@/lib/applications-plans";

import { ApplicationSupportIntakeForm } from "./application-support-intake-form";

type ApplicationSupportIntakeDialogProps = {
  open: boolean;
  applicationId: number;
  sessionId: number;
  studentName: string;
  initialPayload: ApplicationSupportPayload;
  plans: ApplicationPlanCatalogRow[];
  onClose: () => void;
  onSaved?: () => void;
};

export function ApplicationSupportIntakeDialog({
  open,
  applicationId,
  sessionId,
  studentName,
  initialPayload,
  plans,
  onClose,
  onSaved,
}: ApplicationSupportIntakeDialogProps) {
  const [form, setForm] = useState<ApplicationSupportPayload>(initialPayload);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(initialPayload);
    setError(null);
  }, [open, initialPayload]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, isSubmitting]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await updateAdvisorApplicationSupportIntake(
      String(applicationId),
      form,
      String(sessionId),
    );

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onSaved?.();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={isSubmitting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="application-support-intake-title"
        className="flex max-h-[min(90vh,820px)] w-full max-w-[640px] flex-col overflow-hidden rounded-[12px] border border-[#e0deda] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#ece9e4] px-6 py-5">
          <div>
            <h2
              id="application-support-intake-title"
              className="font-[family-name:var(--font-dm-serif)] text-[20px] font-semibold text-[#1a1a1a]"
            >
              Edit application support
            </h2>
            <p className="mt-1 text-[12px] text-[#6a6a6a]">{studentName}</p>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="cursor-pointer rounded-[6px] p-1 text-[#7a7a7a] transition-colors hover:bg-[#f5f4f0] hover:text-[#1a1a1a] disabled:opacity-60"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {error ? (
              <p className="mb-4 rounded-[8px] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]">
                {error}
              </p>
            ) : null}
            <ApplicationSupportIntakeForm
              value={form}
              onChange={setForm}
              plans={plans}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[#ece9e4] px-6 py-4">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[13px] font-medium text-[#4a4a4a] transition-colors hover:bg-[#f5f4f0] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer rounded-[8px] border-0 bg-[#40916C] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#2D6A4F] disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
