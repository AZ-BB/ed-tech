"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

type AdminAddLessonDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function AdminAddLessonDialog({ open, onClose }: AdminAddLessonDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    setFormKey((k) => k + 1);
    setError(null);
  }, [open]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");

    if (!(file instanceof File) || file.size < 1) {
      setError("Choose a file to upload.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/lessons/upload", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as { ok: boolean; error?: string };

      if (!response.ok || !result.ok) {
        setError(result.error ?? "Could not upload lesson document.");
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onClose();
      router.refresh();
    } catch {
      setError("Could not upload lesson document.");
      setIsSubmitting(false);
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
        aria-labelledby="add-lesson-title"
        className="w-full max-w-lg rounded-[12px] border border-[#ece9e4] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ece9e4] px-5 py-4">
          <h2 id="add-lesson-title" className="text-[16px] font-bold text-[#1a1a1a]">
            Add Lesson Document
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

        <form key={formKey} onSubmit={handleSubmit} className="px-5 py-4">
          {error ? (
            <p className="mb-4 rounded-[8px] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]">
              {error}
            </p>
          ) : null}

          <div className="mb-4">
            <label htmlFor="lesson-title" className={labelClassName}>
              Title
            </label>
            <input
              id="lesson-title"
              name="title"
              type="text"
              required
              className={inputClassName}
              placeholder="Document title"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="lesson-description" className={labelClassName}>
              Description
            </label>
            <textarea
              id="lesson-description"
              name="description"
              rows={3}
              className={`${inputClassName} resize-y`}
              placeholder="Short description for teachers"
            />
          </div>

          <div className="mb-5">
            <label htmlFor="lesson-file" className={labelClassName}>
              File
            </label>
            <input
              id="lesson-file"
              name="file"
              type="file"
              required
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/*"
              className="block w-full text-[13px] text-[#4a4a4a] file:mr-3 file:cursor-pointer file:rounded-[6px] file:border-0 file:bg-[#f3f2f0] file:px-3 file:py-2 file:text-[12px] file:font-semibold file:text-[#1a1a1a]"
            />
            <p className="mt-1.5 text-[11px] text-[#a0a0a0]">PDF, Word, Excel, PowerPoint, images, or text. Max 20 MB.</p>
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
              {isSubmitting ? "Uploading…" : "Add Document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
