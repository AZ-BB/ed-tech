"use client";

import {
  translateAdminInternship,
  updateAdminInternshipArabicContent,
} from "@/actions/admin-internship-translation";
import { getLocalizedCountryName } from "@/lib/countries";
import type { InternshipContentAr } from "@/lib/internship-translatable-fields";
import type { AdminInternshipDetailPayload } from "../_lib/fetch-admin-internship-detail";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AdminEditInternshipArDialogProps = {
  open: boolean;
  onClose: () => void;
  internship: AdminInternshipDetailPayload["internship"];
};

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

function linesToText(lines: string[] | undefined): string {
  return (lines ?? []).join("\n");
}

function textToLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function AdminEditInternshipArDialog({
  open,
  onClose,
  internship,
}: AdminEditInternshipArDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetranslating, setIsRetranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    provider: "",
    locationLabel: "",
    field: "",
    payLabel: "",
    duration: "",
    summary: "",
    eligibility: "",
    howToApply: "",
    countryName: "",
    whatYoullDo: "",
    whatYoullGain: "",
  });

  useEffect(() => {
    if (!open) return;
    const ar = internship.contentAr ?? {};
    const codeCountry = getLocalizedCountryName(internship.countryCode, "ar");
    setForm({
      name: ar.name ?? "",
      provider: ar.provider ?? "",
      locationLabel: ar.locationLabel ?? "",
      field: ar.field ?? "",
      payLabel: ar.payLabel ?? "",
      duration: ar.duration ?? "",
      summary: ar.summary ?? "",
      eligibility: ar.eligibility ?? "",
      howToApply: ar.howToApply ?? "",
      countryName: ar.countryName ?? codeCountry ?? "",
      whatYoullDo: linesToText(ar.whatYoullDo),
      whatYoullGain: linesToText(ar.whatYoullGain),
    });
    setError(null);
  }, [open, internship.contentAr, internship.countryCode]);

  if (!open) return null;

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const contentAr: InternshipContentAr = {
      name: form.name.trim() || undefined,
      provider: form.provider.trim() || undefined,
      locationLabel: form.locationLabel.trim() || undefined,
      field: form.field.trim() || undefined,
      payLabel: form.payLabel.trim() || undefined,
      duration: form.duration.trim() || undefined,
      summary: form.summary.trim() || undefined,
      eligibility: form.eligibility.trim() || undefined,
      howToApply: form.howToApply.trim() || undefined,
      countryName: form.countryName.trim() || undefined,
    };

    const doLines = textToLines(form.whatYoullDo);
    if (doLines.length > 0) contentAr.whatYoullDo = doLines;

    const gainLines = textToLines(form.whatYoullGain);
    if (gainLines.length > 0) contentAr.whatYoullGain = gainLines;

    const result = await updateAdminInternshipArabicContent(internship.id, contentAr);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.refresh();
    onClose();
  }

  async function handleRetranslate() {
    setIsRetranslating(true);
    setError(null);
    const result = await translateAdminInternship(internship.id);
    setIsRetranslating(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-internship-ar-title"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[12px] bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="edit-internship-ar-title" className="text-[16px] font-bold text-[#1a1a1a]">
              Edit Arabic content
            </h2>
            <p className="mt-1 text-[12px] text-[#666]">
              Manual edits for {internship.name}. English source fields are unchanged.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-[6px] px-2 py-1 text-[18px] leading-none text-[#888] hover:bg-[#f5f5f5]"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className={labelClassName} htmlFor="int-ar-name">
              Name (Arabic)
            </label>
            <input
              id="int-ar-name"
              className={inputClassName}
              dir="rtl"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="int-ar-provider">
                Provider (Arabic)
              </label>
              <input
                id="int-ar-provider"
                className={inputClassName}
                dir="rtl"
                value={form.provider}
                onChange={(e) => setForm((prev) => ({ ...prev, provider: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="int-ar-location">
                Location (Arabic)
              </label>
              <input
                id="int-ar-location"
                className={inputClassName}
                dir="rtl"
                value={form.locationLabel}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, locationLabel: e.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <label className={labelClassName} htmlFor="int-ar-summary">
              Summary (Arabic)
            </label>
            <textarea
              id="int-ar-summary"
              rows={4}
              className={inputClassName}
              dir="rtl"
              value={form.summary}
              onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="int-ar-field">
                Field (Arabic)
              </label>
              <input
                id="int-ar-field"
                className={inputClassName}
                dir="rtl"
                value={form.field}
                onChange={(e) => setForm((prev) => ({ ...prev, field: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="int-ar-duration">
                Duration (Arabic)
              </label>
              <input
                id="int-ar-duration"
                className={inputClassName}
                dir="rtl"
                value={form.duration}
                onChange={(e) => setForm((prev) => ({ ...prev, duration: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className={labelClassName} htmlFor="int-ar-eligibility">
              Eligibility (Arabic)
            </label>
            <textarea
              id="int-ar-eligibility"
              rows={3}
              className={inputClassName}
              dir="rtl"
              value={form.eligibility}
              onChange={(e) => setForm((prev) => ({ ...prev, eligibility: e.target.value }))}
            />
          </div>

          <div>
            <label className={labelClassName} htmlFor="int-ar-apply">
              How to apply (Arabic)
            </label>
            <textarea
              id="int-ar-apply"
              rows={3}
              className={inputClassName}
              dir="rtl"
              value={form.howToApply}
              onChange={(e) => setForm((prev) => ({ ...prev, howToApply: e.target.value }))}
            />
          </div>

          <div>
            <label className={labelClassName} htmlFor="int-ar-do">
              What you&apos;ll do (Arabic, one per line)
            </label>
            <textarea
              id="int-ar-do"
              rows={4}
              className={inputClassName}
              dir="rtl"
              value={form.whatYoullDo}
              onChange={(e) => setForm((prev) => ({ ...prev, whatYoullDo: e.target.value }))}
            />
          </div>

          <div>
            <label className={labelClassName} htmlFor="int-ar-gain">
              What you&apos;ll gain (Arabic, one per line)
            </label>
            <textarea
              id="int-ar-gain"
              rows={4}
              className={inputClassName}
              dir="rtl"
              value={form.whatYoullGain}
              onChange={(e) => setForm((prev) => ({ ...prev, whatYoullGain: e.target.value }))}
            />
          </div>

          {error ? <p className="text-[12px] font-medium text-[#C0392B]">{error}</p> : null}

          <div className="flex flex-wrap justify-end gap-2 border-t border-[#ece9e4] pt-4">
            <button
              type="button"
              onClick={handleRetranslate}
              disabled={isSubmitting || isRetranslating}
              className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[var(--text)] hover:border-[#40916C] disabled:opacity-60"
            >
              {isRetranslating ? "Re-translating…" : "Re-translate all"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[var(--text)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isRetranslating}
              className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#1B4332] disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : "Save Arabic"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
