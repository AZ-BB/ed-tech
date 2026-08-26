"use client";

import {
  translateAdminScholarship,
  updateAdminScholarshipArabicContent,
} from "@/actions/admin-scholarship-translation";
import { getLocalizedCountryName } from "@/lib/countries";
import type { ScholarshipContentAr } from "@/lib/scholarship-translatable-fields";
import { translateIntakesToArabic } from "@/lib/translation/translate-intakes";
import type { AdminScholarshipDetailPayload } from "../_lib/fetch-admin-scholarship-detail";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AdminEditScholarshipArDialogProps = {
  open: boolean;
  onClose: () => void;
  scholarship: AdminScholarshipDetailPayload["scholarship"];
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

export function AdminEditScholarshipArDialog({
  open,
  onClose,
  scholarship,
}: AdminEditScholarshipArDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetranslating, setIsRetranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    provider: "",
    country: "",
    type: "",
    shortSummary: "",
    eligSummary: "",
    degreeLevels: "",
    fieldsOfStudy: "",
    academicElig: "",
    englishReq: "",
    otherElig: "",
    applicationMethod: "",
    coverageLabel: "",
    tooltip: "",
    competition: "",
    renewable: "",
    deadline: "",
    importantNotes: "",
    coverage_tuition: "",
    coverage_stipend: "",
    coverage_travel: "",
    coverage_other: "",
    intakes: "",
    requiredDocs: "",
    destinations: "",
  });

  useEffect(() => {
    if (!open) return;
    const ar = scholarship.contentAr ?? {};
    const codeIntakes = translateIntakesToArabic(scholarship.intakes);
    const codeCountry = getLocalizedCountryName(scholarship.nationalityCountryCode, "ar");
    setForm({
      name: ar.name ?? "",
      provider: ar.provider ?? "",
      country: ar.country ?? codeCountry ?? "",
      type: ar.type ?? "",
      shortSummary: ar.shortSummary ?? "",
      eligSummary: ar.eligSummary ?? "",
      degreeLevels: ar.degreeLevels ?? "",
      fieldsOfStudy: ar.fieldsOfStudy ?? "",
      academicElig: ar.academicElig ?? "",
      englishReq: ar.englishReq ?? "",
      otherElig: ar.otherElig ?? "",
      applicationMethod: ar.applicationMethod ?? "",
      coverageLabel: ar.coverageLabel ?? "",
      tooltip: ar.tooltip ?? "",
      competition: ar.competition ?? "",
      renewable: ar.renewable ?? "",
      deadline: ar.deadline ?? "",
      importantNotes: ar.importantNotes ?? "",
      coverage_tuition: ar.coverage_tuition ?? "",
      coverage_stipend: ar.coverage_stipend ?? "",
      coverage_travel: ar.coverage_travel ?? "",
      coverage_other: ar.coverage_other ?? "",
      intakes: ar.intakes ?? codeIntakes ?? "",
      requiredDocs: linesToText(ar.requiredDocs),
      destinations: linesToText(ar.destinations),
    });
    setError(null);
  }, [
    open,
    scholarship.contentAr,
    scholarship.intakes,
    scholarship.nationalityCountryCode,
  ]);

  if (!open) return null;

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const contentAr: ScholarshipContentAr = {
      name: form.name.trim() || undefined,
      provider: form.provider.trim() || undefined,
      country: form.country.trim() || undefined,
      type: form.type.trim() || undefined,
      shortSummary: form.shortSummary.trim() || undefined,
      eligSummary: form.eligSummary.trim() || undefined,
      degreeLevels: form.degreeLevels.trim() || undefined,
      fieldsOfStudy: form.fieldsOfStudy.trim() || undefined,
      academicElig: form.academicElig.trim() || undefined,
      englishReq: form.englishReq.trim() || undefined,
      otherElig: form.otherElig.trim() || undefined,
      applicationMethod: form.applicationMethod.trim() || undefined,
      coverageLabel: form.coverageLabel.trim() || undefined,
      tooltip: form.tooltip.trim() || undefined,
      competition: form.competition.trim() || undefined,
      renewable: form.renewable.trim() || undefined,
      deadline: form.deadline.trim() || undefined,
      importantNotes: form.importantNotes.trim() || undefined,
      coverage_tuition: form.coverage_tuition.trim() || undefined,
      coverage_stipend: form.coverage_stipend.trim() || undefined,
      coverage_travel: form.coverage_travel.trim() || undefined,
      coverage_other: form.coverage_other.trim() || undefined,
      intakes: form.intakes.trim() || undefined,
    };

    const docs = textToLines(form.requiredDocs);
    if (docs.length > 0) contentAr.requiredDocs = docs;

    const destinations = textToLines(form.destinations);
    if (destinations.length > 0) contentAr.destinations = destinations;

    const result = await updateAdminScholarshipArabicContent(scholarship.id, contentAr);
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
    const result = await translateAdminScholarship(scholarship.id);
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
      aria-labelledby="edit-scholarship-ar-title"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[12px] bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="edit-scholarship-ar-title" className="text-[16px] font-bold text-[#1a1a1a]">
              Edit Arabic content
            </h2>
            <p className="mt-1 text-[12px] text-[#666]">
              Manual edits for {scholarship.name}. English source fields are unchanged.
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
            <label className={labelClassName} htmlFor="sch-ar-name">
              Name (Arabic)
            </label>
            <input
              id="sch-ar-name"
              className={inputClassName}
              dir="rtl"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="sch-ar-provider">
                Provider (Arabic)
              </label>
              <input
                id="sch-ar-provider"
                className={inputClassName}
                dir="rtl"
                value={form.provider}
                onChange={(e) => setForm((prev) => ({ ...prev, provider: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="sch-ar-country">
                Country (Arabic)
              </label>
              <input
                id="sch-ar-country"
                className={inputClassName}
                dir="rtl"
                value={form.country}
                onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className={labelClassName} htmlFor="sch-ar-summary">
              Short summary (Arabic)
            </label>
            <textarea
              id="sch-ar-summary"
              rows={4}
              className={inputClassName}
              dir="rtl"
              value={form.shortSummary}
              onChange={(e) => setForm((prev) => ({ ...prev, shortSummary: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="sch-ar-elig">
                Eligibility summary (Arabic)
              </label>
              <textarea
                id="sch-ar-elig"
                rows={3}
                className={inputClassName}
                dir="rtl"
                value={form.eligSummary}
                onChange={(e) => setForm((prev) => ({ ...prev, eligSummary: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="sch-ar-degrees">
                Degree levels (Arabic)
              </label>
              <input
                id="sch-ar-degrees"
                className={inputClassName}
                dir="rtl"
                value={form.degreeLevels}
                onChange={(e) => setForm((prev) => ({ ...prev, degreeLevels: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className={labelClassName} htmlFor="sch-ar-fields">
              Fields of study (Arabic)
            </label>
            <input
              id="sch-ar-fields"
              className={inputClassName}
              dir="rtl"
              value={form.fieldsOfStudy}
              onChange={(e) => setForm((prev) => ({ ...prev, fieldsOfStudy: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="sch-ar-academic">
                Academic eligibility (Arabic)
              </label>
              <textarea
                id="sch-ar-academic"
                rows={3}
                className={inputClassName}
                dir="rtl"
                value={form.academicElig}
                onChange={(e) => setForm((prev) => ({ ...prev, academicElig: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="sch-ar-method">
                Application method (Arabic)
              </label>
              <input
                id="sch-ar-method"
                className={inputClassName}
                dir="rtl"
                value={form.applicationMethod}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, applicationMethod: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="sch-ar-coverage">
                Coverage label (Arabic)
              </label>
              <input
                id="sch-ar-coverage"
                className={inputClassName}
                dir="rtl"
                value={form.coverageLabel}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, coverageLabel: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="sch-ar-deadline">
                Deadline (Arabic)
              </label>
              <input
                id="sch-ar-deadline"
                className={inputClassName}
                dir="rtl"
                value={form.deadline}
                onChange={(e) => setForm((prev) => ({ ...prev, deadline: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className={labelClassName} htmlFor="sch-ar-docs">
              Required documents (Arabic, one per line)
            </label>
            <textarea
              id="sch-ar-docs"
              rows={4}
              className={inputClassName}
              dir="rtl"
              value={form.requiredDocs}
              onChange={(e) => setForm((prev) => ({ ...prev, requiredDocs: e.target.value }))}
            />
          </div>

          <div>
            <label className={labelClassName} htmlFor="sch-ar-destinations">
              Destinations (Arabic, one per line)
            </label>
            <textarea
              id="sch-ar-destinations"
              rows={3}
              className={inputClassName}
              dir="rtl"
              value={form.destinations}
              onChange={(e) => setForm((prev) => ({ ...prev, destinations: e.target.value }))}
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
