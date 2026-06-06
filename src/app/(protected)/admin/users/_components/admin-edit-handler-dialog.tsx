"use client";

import { updateAdminHandler } from "@/actions/admin-handlers";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { AdminHandlerTableRow } from "../_lib/fetch-admin-handlers-page";
import { runAdminFormSubmit } from "../_lib/run-admin-form-submit";

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C]";

const labelClassName = "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

type AdminEditHandlerDialogProps = {
  open: boolean;
  onClose: () => void;
  row: AdminHandlerTableRow | null;
};

export function AdminEditHandlerDialog({ open, onClose, row }: AdminEditHandlerDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open, row?.id]);

  if (!open || !row) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    await runAdminFormSubmit(
      {
        setSubmitting: setIsSubmitting,
        setError,
      },
      () => updateAdminHandler(new FormData(form)),
      () => {
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
        aria-labelledby="edit-handler-title"
        className="w-full max-w-lg rounded-[12px] border border-[#ece9e4] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ece9e4] px-5 py-4">
          <h2 id="edit-handler-title" className="text-[16px] font-bold text-[#1a1a1a]">
            Edit Handler
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

          <input type="hidden" name="handlerId" value={row.id} />

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-handler-first-name" className={labelClassName}>
                First name
              </label>
              <input
                id="edit-handler-first-name"
                name="firstName"
                type="text"
                required
                defaultValue={row.firstName}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="edit-handler-last-name" className={labelClassName}>
                Last name
              </label>
              <input
                id="edit-handler-last-name"
                name="lastName"
                type="text"
                required
                defaultValue={row.lastName}
                className={inputClassName}
              />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="edit-handler-email" className={labelClassName}>
              Email
            </label>
            <input
              id="edit-handler-email"
              name="email"
              type="email"
              required
              defaultValue={row.email}
              className={inputClassName}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="edit-handler-phone" className={labelClassName}>
              Phone
            </label>
            <input
              id="edit-handler-phone"
              name="phone"
              type="tel"
              defaultValue={row.phone ?? ""}
              className={inputClassName}
            />
          </div>

          <label className="mb-5 flex cursor-pointer items-center gap-2 text-[13px] text-[#4a4a4a]">
            <input
              type="checkbox"
              name="isActive"
              value="true"
              defaultChecked={row.isActive}
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
              {isSubmitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
