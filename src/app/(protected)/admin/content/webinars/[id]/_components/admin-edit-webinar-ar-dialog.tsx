"use client";

import {
  translateAdminWebinar,
  updateAdminWebinarArabicContent,
} from "@/actions/admin-webinar-translation";
import type { AdminWebinarDetailPayload } from "@/app/(protected)/admin/content/_lib/fetch-admin-webinar-detail";
import type { WebinarContentAr } from "@/lib/webinar-translatable-fields";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AdminEditWebinarArDialogProps = {
  open: boolean;
  onClose: () => void;
  payload: AdminWebinarDetailPayload;
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

export function AdminEditWebinarArDialog({
  open,
  onClose,
  payload,
}: AdminEditWebinarArDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetranslating, setIsRetranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    format: "",
    speakerName: "",
    speakerTitle: "",
    speakerBio: "",
    tags: "",
    agenda: "",
  });

  useEffect(() => {
    if (!open) return;
    const ar = payload.contentAr ?? {};
    setForm({
      title: ar.title ?? "",
      description: ar.description ?? "",
      format: ar.format ?? "",
      speakerName: ar.speakerName ?? "",
      speakerTitle: ar.speakerTitle ?? "",
      speakerBio: ar.speakerBio ?? "",
      tags: linesToText(ar.tags),
      agenda: linesToText(ar.agenda),
    });
    setError(null);
  }, [open, payload.contentAr]);

  if (!open) return null;

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const contentAr: WebinarContentAr = {
      title: form.title.trim() || undefined,
      description: form.description.trim() || undefined,
      format: form.format.trim() || undefined,
      speakerName: form.speakerName.trim() || undefined,
      speakerTitle: form.speakerTitle.trim() || undefined,
      speakerBio: form.speakerBio.trim() || undefined,
    };

    const tagLines = textToLines(form.tags);
    if (tagLines.length > 0) contentAr.tags = tagLines;

    const agendaLines = textToLines(form.agenda);
    if (agendaLines.length > 0) contentAr.agenda = agendaLines;

    const result = await updateAdminWebinarArabicContent(payload.id, contentAr);
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
    const result = await translateAdminWebinar(payload.id);
    setIsRetranslating(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[14px] bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-webinar-ar-title"
      >
        <h2 id="edit-webinar-ar-title" className="text-lg font-semibold text-[var(--text)]">
          Edit Arabic content
        </h2>
        <p className="mt-1 text-[12px] text-[var(--text-light)]">{payload.title}</p>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          {(
            [
              ["title", "Title"],
              ["format", "Format"],
              ["speakerName", "Speaker name"],
              ["speakerTitle", "Speaker title"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className={labelClassName} htmlFor={`webinar-ar-${key}`}>
                {label}
              </label>
              <input
                id={`webinar-ar-${key}`}
                dir="rtl"
                className={inputClassName}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}

          <div>
            <label className={labelClassName} htmlFor="webinar-ar-description">
              Description
            </label>
            <textarea
              id="webinar-ar-description"
              dir="rtl"
              rows={4}
              className={inputClassName}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div>
            <label className={labelClassName} htmlFor="webinar-ar-speakerBio">
              Speaker bio
            </label>
            <textarea
              id="webinar-ar-speakerBio"
              dir="rtl"
              rows={3}
              className={inputClassName}
              value={form.speakerBio}
              onChange={(e) => setForm((f) => ({ ...f, speakerBio: e.target.value }))}
            />
          </div>

          <div>
            <label className={labelClassName} htmlFor="webinar-ar-tags">
              Tags (one per line)
            </label>
            <textarea
              id="webinar-ar-tags"
              dir="rtl"
              rows={2}
              className={inputClassName}
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            />
          </div>

          <div>
            <label className={labelClassName} htmlFor="webinar-ar-agenda">
              Agenda (one item per line)
            </label>
            <textarea
              id="webinar-ar-agenda"
              dir="rtl"
              rows={4}
              className={inputClassName}
              value={form.agenda}
              onChange={(e) => setForm((f) => ({ ...f, agenda: e.target.value }))}
            />
          </div>

          {error ? (
            <p className="text-[12px] font-medium text-[#C0392B]" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-light)] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-[8px] border border-[#e0deda] px-4 py-2 text-[12px] font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRetranslate}
              disabled={isRetranslating || isSubmitting}
              className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-white px-4 py-2 text-[12px] font-semibold text-[#2D6A4F] disabled:opacity-60"
            >
              {isRetranslating ? "Retranslating…" : "Retranslate all"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isRetranslating}
              className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : "Save Arabic"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
