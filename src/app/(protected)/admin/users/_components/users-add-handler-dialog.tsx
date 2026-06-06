"use client";

import { createAdminHandler } from "@/actions/admin-handlers";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { runAdminFormSubmit } from "../_lib/run-admin-form-submit";

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

type UsersAddHandlerDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function UsersAddHandlerDialog({ open, onClose }: UsersAddHandlerDialogProps) {
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
    const form = event.currentTarget;

    await runAdminFormSubmit(
      {
        setSubmitting: setIsSubmitting,
        setError,
      },
      () => createAdminHandler(new FormData(form)),
      () => {
        form.reset();
        router.refresh();
        onClose();
      },
    );
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-labelledby="add-handler-title"
        className="w-full max-w-lg rounded-[12px] border border-[#ece9e4] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ece9e4] px-5 py-4">
          <h2 id="add-handler-title" className="text-[16px] font-bold text-[#1a1a1a]">
            Add Handler
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

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="handler-first-name" className={labelClassName}>
                First name
              </label>
              <input
                id="handler-first-name"
                name="firstName"
                type="text"
                required
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="handler-last-name" className={labelClassName}>
                Last name
              </label>
              <input
                id="handler-last-name"
                name="lastName"
                type="text"
                required
                className={inputClassName}
              />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="handler-email" className={labelClassName}>
              Email
            </label>
            <input
              id="handler-email"
              name="email"
              type="email"
              required
              className={inputClassName}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="handler-phone" className={labelClassName}>
              Phone
            </label>
            <input
              id="handler-phone"
              name="phone"
              type="tel"
              className={inputClassName}
            />
          </div>

          <label className="mb-5 flex cursor-pointer items-center gap-2 text-[13px] text-[#4a4a4a]">
            <input
              type="checkbox"
              name="isActive"
              value="true"
              defaultChecked
              className="h-4 w-4 rounded border-[#e0deda] text-[#2D6A4F] focus:ring-[#40916C]"
            />
            Active (available for application assignment)
          </label>

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
              {isSubmitting ? "Saving…" : "Add Handler"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
