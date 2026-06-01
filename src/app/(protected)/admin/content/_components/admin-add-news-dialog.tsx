"use client";

import { createAdminNewsItem } from "@/actions/admin-news";
import { ADMIN_NEWS_TAG_OPTIONS } from "../_data/admin-news-data";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

const selectClassName =
  "w-full cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_12px_center] bg-no-repeat px-3 py-2 pr-9 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

type AdminAddNewsDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function AdminAddNewsDialog({ open, onClose }: AdminAddNewsDialogProps) {
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
    const result = await createAdminNewsItem(formData);

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
        aria-labelledby="add-news-title"
        className="w-full max-w-lg rounded-[12px] border border-[#ece9e4] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ece9e4] px-5 py-4">
          <h2 id="add-news-title" className="text-[16px] font-bold text-[#1a1a1a]">
            Add News Item
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
            <label htmlFor="news-tag" className={labelClassName}>
              Tag
            </label>
            <select
              id="news-tag"
              name="tag"
              required
              defaultValue="update"
              className={selectClassName}
              style={{ backgroundImage: SELECT_CHEVRON }}
            >
              {ADMIN_NEWS_TAG_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-5">
            <label htmlFor="news-text" className={labelClassName}>
              Headline
            </label>
            <input
              id="news-text"
              name="text"
              type="text"
              required
              className={inputClassName}
              placeholder="News headline"
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
              {isSubmitting ? "Saving…" : "Add News Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
