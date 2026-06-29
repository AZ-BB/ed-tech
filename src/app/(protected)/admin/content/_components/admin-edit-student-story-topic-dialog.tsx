"use client";

import { updateAdminStudentStoryTopic } from "@/actions/admin-student-stories";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { AdminStudentStoryTopicRow } from "../_lib/fetch-admin-student-story-topics";
import {
  storyInputClassName,
  storyLabelClassName,
} from "./admin-student-story-form-fields";

type AdminEditStudentStoryTopicDialogProps = {
  open: boolean;
  onClose: () => void;
  row: AdminStudentStoryTopicRow | null;
};

export function AdminEditStudentStoryTopicDialog({
  open,
  onClose,
  row,
}: AdminEditStudentStoryTopicDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open]);

  if (!open || !row) return null;

  const editingRow = row;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    formData.set("id", String(editingRow.id));
    const result = await updateAdminStudentStoryTopic(formData);

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
        aria-labelledby="edit-story-topic-title"
        className="w-full max-w-lg rounded-[12px] border border-[#ece9e4] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ece9e4] px-5 py-4">
          <h2 id="edit-story-topic-title" className="text-[16px] font-bold text-[#1a1a1a]">
            Edit Topic
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

          <div className="mb-4">
            <label htmlFor="edit-topic-name" className={storyLabelClassName}>
              Name
            </label>
            <input
              id="edit-topic-name"
              name="name"
              type="text"
              required
              defaultValue={row.name}
              className={storyInputClassName}
            />
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-topic-sort-order" className={storyLabelClassName}>
                Sort order
              </label>
              <input
                id="edit-topic-sort-order"
                name="sort_order"
                type="number"
                defaultValue={row.sortOrder}
                className={storyInputClassName}
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#4a4a4a]">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={row.isActive}
                  className="h-4 w-4 rounded border-[#e0deda] accent-[#2D6A4F]"
                />
                Active
              </label>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="edit-topic-gradient" className={storyLabelClassName}>
              Card gradient CSS
            </label>
            <input
              id="edit-topic-gradient"
              name="gradient_css"
              type="text"
              defaultValue={row.gradientCss ?? ""}
              className={storyInputClassName}
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
