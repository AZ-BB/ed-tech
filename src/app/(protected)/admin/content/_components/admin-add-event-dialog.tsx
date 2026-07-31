"use client";

import { createAdminEvent } from "@/actions/admin-events";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AdminEventFormFields } from "./admin-event-form-fields";

type AdminAddEventDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function AdminAddEventDialog({ open, onClose }: AdminAddEventDialogProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  function handleClose() {
    if (isPending) return;
    setError(null);
    onClose();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createAdminEvent(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/admin/content/events/${result.eventUuid}`);
      router.refresh();
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) handleClose();
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[14px] border border-[#ece9e4] bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-event-title"
      >
        <h2 id="add-event-title" className="mb-4 text-[16px] font-bold text-[#1a1a1a]">
          Add event
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AdminEventFormFields idPrefix="add-" />

          {error ? (
            <p className="text-[13px] text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-[#ece9e4] pt-4">
            <button
              type="button"
              disabled={isPending}
              onClick={handleClose}
              className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a] hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#1B4332] disabled:opacity-60"
            >
              {isPending ? "Creating…" : "Create event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
