"use client";

import {
  translateAdminEvent,
  updateAdminEventArabicContent,
} from "@/actions/admin-event-translation";
import type { AdminEventDetailPayload } from "@/app/(protected)/admin/content/_lib/fetch-admin-event-detail";
import type { EventContentAr } from "@/lib/event-translatable-fields";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AdminEditEventArDialogProps = {
  open: boolean;
  onClose: () => void;
  payload: AdminEventDetailPayload;
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

export function AdminEditEventArDialog({
  open,
  onClose,
  payload,
}: AdminEditEventArDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetranslating, setIsRetranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    eventName: "",
    eventType: "",
    recommendedTag: "",
    shortDescription: "",
    fullOverview: "",
    city: "",
    venue: "",
    organizer: "",
    cost: "",
    regionFocus: "",
    timeDisplay: "",
    country: "",
    topicsCovered: "",
    targetAudience: "",
    whyAttend: "",
    prepSteps: "",
    universitiesAttending: "",
  });

  useEffect(() => {
    if (!open) return;
    const ar = payload.contentAr ?? {};
    setForm({
      eventName: ar.eventName ?? "",
      eventType: ar.eventType ?? "",
      recommendedTag: ar.recommendedTag ?? "",
      shortDescription: ar.shortDescription ?? "",
      fullOverview: ar.fullOverview ?? "",
      city: ar.city ?? "",
      venue: ar.venue ?? "",
      organizer: ar.organizer ?? "",
      cost: ar.cost ?? "",
      regionFocus: ar.regionFocus ?? "",
      timeDisplay: ar.timeDisplay ?? "",
      country: ar.country ?? "",
      topicsCovered: linesToText(ar.topicsCovered),
      targetAudience: linesToText(ar.targetAudience),
      whyAttend: linesToText(ar.whyAttend),
      prepSteps: linesToText(ar.prepSteps),
      universitiesAttending: linesToText(ar.universitiesAttending),
    });
    setError(null);
  }, [open, payload.contentAr]);

  if (!open) return null;

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const contentAr: EventContentAr = {
      eventName: form.eventName.trim() || undefined,
      eventType: form.eventType.trim() || undefined,
      recommendedTag: form.recommendedTag.trim() || undefined,
      shortDescription: form.shortDescription.trim() || undefined,
      fullOverview: form.fullOverview.trim() || undefined,
      city: form.city.trim() || undefined,
      venue: form.venue.trim() || undefined,
      organizer: form.organizer.trim() || undefined,
      cost: form.cost.trim() || undefined,
      regionFocus: form.regionFocus.trim() || undefined,
      timeDisplay: form.timeDisplay.trim() || undefined,
      country: form.country.trim() || undefined,
    };

    const listFields = [
      ["topicsCovered", form.topicsCovered],
      ["targetAudience", form.targetAudience],
      ["whyAttend", form.whyAttend],
      ["prepSteps", form.prepSteps],
      ["universitiesAttending", form.universitiesAttending],
    ] as const;

    for (const [key, text] of listFields) {
      const lines = textToLines(text);
      if (lines.length > 0) contentAr[key] = lines;
    }

    const result = await updateAdminEventArabicContent(payload.event.id, contentAr);
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
    const result = await translateAdminEvent(payload.event.id);
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
        aria-labelledby="edit-event-ar-title"
      >
        <h2 id="edit-event-ar-title" className="text-lg font-semibold text-[var(--text)]">
          Edit Arabic content
        </h2>
        <p className="mt-1 text-[12px] text-[var(--text-light)]">{payload.event.event_name}</p>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          {(
            [
              ["eventName", "Event name"],
              ["eventType", "Event type"],
              ["recommendedTag", "Recommended tag"],
              ["shortDescription", "Short description"],
              ["organizer", "Organizer"],
              ["city", "City"],
              ["venue", "Venue"],
              ["country", "Country"],
              ["regionFocus", "Region focus (Quick info)"],
              ["timeDisplay", "Time display (Quick info)"],
              ["cost", "Cost"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className={labelClassName} htmlFor={`event-ar-${key}`}>
                {label}
              </label>
              <input
                id={`event-ar-${key}`}
                dir="rtl"
                className={inputClassName}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}

          {(
            [
              ["fullOverview", "Full overview"],
              ["topicsCovered", "Topics covered (one per line)"],
              ["targetAudience", "Target audience (one per line)"],
              ["whyAttend", "Why attend (one per line)"],
              ["prepSteps", "Prep steps (one per line)"],
              ["universitiesAttending", "Universities attending (one per line)"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className={labelClassName} htmlFor={`event-ar-${key}`}>
                {label}
              </label>
              <textarea
                id={`event-ar-${key}`}
                dir="rtl"
                rows={key === "fullOverview" ? 5 : 3}
                className={inputClassName}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}

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
