"use client";

import {
  translateAdminUniversity,
  updateAdminUniversityArabicContent,
} from "@/actions/admin-university-translation";
import { getLocalizedCountryName } from "@/lib/countries";
import type { UniversityContentAr } from "@/lib/university-translatable-fields";
import { translateIntakesToArabic } from "@/lib/translation/translate-intakes";
import type { AdminUniversityDetailPayload } from "../_lib/fetch-admin-university-detail";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AdminEditUniversityArDialogProps = {
  open: boolean;
  onClose: () => void;
  university: AdminUniversityDetailPayload["university"];
};

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

function documentsToText(docs: string[] | undefined): string {
  return (docs ?? []).join("\n");
}

function textToDocuments(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function AdminEditUniversityArDialog({
  open,
  onClose,
  university,
}: AdminEditUniversityArDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetranslating, setIsRetranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    tuition_display: "",
    living_display: "",
    sat_policy: "",
    method: "",
    intakes: "",
    city: "",
    country_name: "",
    documents: "",
    scholarship_note: "",
  });

    useEffect(() => {
    if (!open) return;
    const ar = university.contentAr ?? {};
    const codeIntakes = translateIntakesToArabic(university.intakes);
    const codeCountry = getLocalizedCountryName(university.countryCode, "ar");
    setForm({
      name: ar.name ?? "",
      description: ar.description ?? "",
      tuition_display: ar.tuition_display ?? ar.tuition_sentence ?? "",
      living_display: ar.living_display ?? ar.living_sentence ?? "",
      sat_policy: ar.sat_policy ?? "",
      method: ar.method ?? "",
      intakes: ar.intakes ?? codeIntakes ?? "",
      city: ar.city ?? "",
      country_name: ar.country_name ?? codeCountry ?? "",
      documents: documentsToText(ar.documents),
      scholarship_note: ar.scholarship_note ?? "",
    });
    setError(null);
  }, [open, university.contentAr, university.intakes, university.countryCode]);

  if (!open) return null;

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const contentAr: UniversityContentAr = {
      name: form.name.trim() || undefined,
      description: form.description.trim() || undefined,
      tuition_display: form.tuition_display.trim() || undefined,
      living_display: form.living_display.trim() || undefined,
      sat_policy: form.sat_policy.trim() || undefined,
      method: form.method.trim() || undefined,
      intakes: form.intakes.trim() || undefined,
      city: form.city.trim() || undefined,
      country_name: form.country_name.trim() || undefined,
      scholarship_note: form.scholarship_note.trim() || undefined,
    };

    const docs = textToDocuments(form.documents);
    if (docs.length > 0) contentAr.documents = docs;

    const result = await updateAdminUniversityArabicContent(university.id, contentAr);
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
    const result = await translateAdminUniversity(university.id);
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
      aria-labelledby="edit-ar-title"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[12px] bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="edit-ar-title" className="text-[16px] font-bold text-[#1a1a1a]">
              Edit Arabic content
            </h2>
            <p className="mt-1 text-[12px] text-[#666]">
              Manual edits for {university.name}. English source fields are unchanged.
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
            <label className={labelClassName} htmlFor="ar-name">
              Name (Arabic)
            </label>
            <input
              id="ar-name"
              className={inputClassName}
              dir="rtl"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div>
            <label className={labelClassName} htmlFor="ar-description">
              Description (Arabic)
            </label>
            <textarea
              id="ar-description"
              rows={5}
              className={inputClassName}
              dir="rtl"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="ar-tuition">
                Tuition (Arabic)
              </label>
              <input
                id="ar-tuition"
                className={inputClassName}
                dir="rtl"
                value={form.tuition_display}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, tuition_display: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="ar-living">
                Living cost (Arabic)
              </label>
              <input
                id="ar-living"
                className={inputClassName}
                dir="rtl"
                value={form.living_display}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, living_display: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="ar-sat">
                SAT policy (Arabic)
              </label>
              <input
                id="ar-sat"
                className={inputClassName}
                dir="rtl"
                value={form.sat_policy}
                onChange={(e) => setForm((prev) => ({ ...prev, sat_policy: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="ar-method">
                Application method (Arabic)
              </label>
              <input
                id="ar-method"
                className={inputClassName}
                dir="rtl"
                value={form.method}
                onChange={(e) => setForm((prev) => ({ ...prev, method: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="ar-city">
                City (Arabic)
              </label>
              <input
                id="ar-city"
                className={inputClassName}
                dir="rtl"
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClassName} htmlFor="ar-country">
                Country (Arabic)
              </label>
              <input
                id="ar-country"
                className={inputClassName}
                dir="rtl"
                value={form.country_name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, country_name: e.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <label className={labelClassName} htmlFor="ar-intakes">
              Intakes (Arabic)
            </label>
            <input
              id="ar-intakes"
              className={inputClassName}
              dir="rtl"
              value={form.intakes}
              onChange={(e) => setForm((prev) => ({ ...prev, intakes: e.target.value }))}
            />
          </div>

          {university.isScholarshipAvailable ? (
            <div>
              <label className={labelClassName} htmlFor="ar-scholarship">
                Scholarship note (Arabic)
              </label>
              <textarea
                id="ar-scholarship"
                rows={2}
                className={inputClassName}
                dir="rtl"
                value={form.scholarship_note}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, scholarship_note: e.target.value }))
                }
              />
            </div>
          ) : null}

          <div>
            <label className={labelClassName} htmlFor="ar-documents">
              Required documents (Arabic, one per line)
            </label>
            <textarea
              id="ar-documents"
              rows={4}
              className={inputClassName}
              dir="rtl"
              value={form.documents}
              onChange={(e) => setForm((prev) => ({ ...prev, documents: e.target.value }))}
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
