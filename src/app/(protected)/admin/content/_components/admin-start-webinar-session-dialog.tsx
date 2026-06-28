"use client";

import { startAdminWebinarSession } from "@/actions/admin-webinars";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { webinarInputClassName, webinarLabelClassName } from "./admin-webinar-form-fields";

type AdminStartWebinarSessionDialogProps = {
  open: boolean;
  onClose: () => void;
  webinarId: number;
  webinarTitle: string;
};

export function AdminStartWebinarSessionDialog({
  open,
  onClose,
  webinarId,
  webinarTitle,
}: AdminStartWebinarSessionDialogProps) {
  const router = useRouter();
  const [meetingLink, setMeetingLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await startAdminWebinarSession(webinarId, meetingLink);

    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    if (result.emailErrors.length > 0) {
      window.alert(
        `Session started. Emails sent: ${result.emailsSent}. Some emails failed:\n${result.emailErrors.join("\n")}`,
      );
    }

    setIsSubmitting(false);
    setMeetingLink("");
    onClose();
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-labelledby="start-webinar-title"
        className="w-full max-w-lg rounded-[12px] border border-[#ece9e4] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ece9e4] px-5 py-4">
          <h2 id="start-webinar-title" className="text-[16px] font-bold text-[#1a1a1a]">
            Start session
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-[6px] px-2 py-1 text-[#a0a0a0] hover:bg-[#f3f2f0] hover:text-[#1a1a1a]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4">
          {error ? (
            <p className="mb-4 rounded-[8px] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]">
              {error}
            </p>
          ) : null}

          <p className="mb-4 text-[13px] leading-relaxed text-[#4a4a4a]">
            Start <strong>{webinarTitle}</strong> and email the meeting link to all enrolled
            students who have not received it yet.
          </p>

          <div className="mb-5">
            <label htmlFor="webinar-meeting-link" className={webinarLabelClassName}>
              Meeting link
            </label>
            <input
              id="webinar-meeting-link"
              name="meeting_link"
              type="url"
              required
              value={meetingLink}
              onChange={(event) => setMeetingLink(event.target.value)}
              className={webinarInputClassName}
              placeholder="https://meet.google.com/..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a] hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#1B4332] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Starting…" : "Start & send emails"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
