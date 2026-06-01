"use client";

import { updateAdminAnnouncement } from "@/actions/admin-announcements";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AdminAnnouncementTableRow } from "../_lib/fetch-admin-announcements-page";

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

type AdminEditAnnouncementDialogProps = {
  open: boolean;
  onClose: () => void;
  row: AdminAnnouncementTableRow | null;
};

export function AdminEditAnnouncementDialog({
  open,
  onClose,
  row,
}: AdminEditAnnouncementDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !row) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await updateAdminAnnouncement(formData);

    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
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
        aria-labelledby="edit-announcement-title"
        className="w-full max-w-lg rounded-[12px] border border-[#ece9e4] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ece9e4] px-5 py-4">
          <h2 id="edit-announcement-title" className="text-[16px] font-bold text-[#1a1a1a]">
            Edit Announcement
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
          <input type="hidden" name="id" value={row.id} />

          {error ? (
            <p className="mb-4 rounded-[8px] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]">
              {error}
            </p>
          ) : null}

          <div className="mb-4">
            <label htmlFor="edit-announcement-title-input" className={labelClassName}>
              Title
            </label>
            <input
              id="edit-announcement-title-input"
              name="title"
              type="text"
              required
              defaultValue={row.title}
              className={inputClassName}
            />
          </div>

          <div className="mb-5">
            <label htmlFor="edit-announcement-content" className={labelClassName}>
              Content
            </label>
            <textarea
              id="edit-announcement-content"
              name="content"
              required
              rows={5}
              defaultValue={row.content}
              className={`${inputClassName} resize-y`}
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
              {isSubmitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
