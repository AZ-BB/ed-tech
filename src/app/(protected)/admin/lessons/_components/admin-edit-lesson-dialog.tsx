"use client";

import { updateAdminLesson } from "@/actions/admin-lessons";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AdminLessonTableRow } from "../_lib/fetch-admin-lessons-page";

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

type AdminEditLessonDialogProps = {
  open: boolean;
  onClose: () => void;
  row: AdminLessonTableRow | null;
};

export function AdminEditLessonDialog({ open, onClose, row }: AdminEditLessonDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replaceError, setReplaceError] = useState<string | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);

  if (!open || !row) return null;

  const documentId = row.id;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await updateAdminLesson(formData);

    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    onClose();
    router.refresh();
  }

  async function handleReplaceFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsReplacing(true);
    setReplaceError(null);

    const formData = new FormData();
    formData.set("documentId", documentId);
    formData.set("file", file);

    try {
      const response = await fetch("/api/admin/lessons/upload", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as { ok: boolean; error?: string };

      if (!response.ok || !result.ok) {
        setReplaceError(result.error ?? "Could not replace the file.");
        setIsReplacing(false);
        return;
      }

      setIsReplacing(false);
      router.refresh();
    } catch {
      setReplaceError("Could not replace the file.");
      setIsReplacing(false);
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-labelledby="edit-lesson-title"
        className="w-full max-w-lg rounded-[12px] border border-[#ece9e4] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ece9e4] px-5 py-4">
          <h2 id="edit-lesson-title" className="text-[16px] font-bold text-[#1a1a1a]">
            Edit Lesson Document
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
            <label htmlFor="edit-lesson-title-input" className={labelClassName}>
              Title
            </label>
            <input
              id="edit-lesson-title-input"
              name="title"
              type="text"
              required
              defaultValue={row.title}
              className={inputClassName}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="edit-lesson-description" className={labelClassName}>
              Description
            </label>
            <textarea
              id="edit-lesson-description"
              name="description"
              rows={3}
              defaultValue={row.description}
              className={`${inputClassName} resize-y`}
              placeholder="Short description for teachers"
            />
          </div>

          <div className="mb-5">
            <label className={labelClassName}>Current file</label>
            <p className="mb-2 text-[13px] text-[#4a4a4a]">{row.fileName || "—"}</p>
            <label htmlFor="edit-lesson-file" className="mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]">
              Replace file (optional)
            </label>
            <input
              id="edit-lesson-file"
              type="file"
              disabled={isReplacing}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/*"
              onChange={handleReplaceFile}
              className="block w-full text-[13px] text-[#4a4a4a] file:mr-3 file:cursor-pointer file:rounded-[6px] file:border-0 file:bg-[#f3f2f0] file:px-3 file:py-2 file:text-[12px] file:font-semibold file:text-[#1a1a1a] disabled:opacity-60"
            />
            {isReplacing ? (
              <p className="mt-1.5 text-[11px] text-[#4a4a4a]">Uploading replacement…</p>
            ) : null}
            {replaceError ? (
              <p className="mt-1.5 text-[11px] text-[#b91c1c]">{replaceError}</p>
            ) : null}
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
