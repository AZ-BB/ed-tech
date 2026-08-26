"use client";

import { deleteAdminEvent, updateAdminEvent } from "@/actions/admin-events";
import { ADMIN_EVENTS_HOME } from "@/app/(protected)/admin/content/_data/content-tabs-data";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { AdminEventDetailPayload } from "../_lib/fetch-admin-event-detail";
import { AdminEventFormFields } from "./admin-event-form-fields";
import { AdminEventTranslatePanel } from "../events/[id]/_components/admin-event-translate-panel";

export function AdminEventDetailClient({ payload }: { payload: AdminEventDetailPayload }) {
  const event = payload.event;
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSavePending, startSaveTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError(null);
    const form = new FormData(formEvent.currentTarget);

    startSaveTransition(async () => {
      const result = await updateAdminEvent(event.id, form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete() {
    const confirmMessage = `Delete "${event.event_name}" permanently?\n\nThis removes the event and related student saves. This cannot be undone.`;
    if (!window.confirm(confirmMessage)) return;

    setError(null);
    startDeleteTransition(async () => {
      const result = await deleteAdminEvent(event.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(ADMIN_EVENTS_HOME);
    });
  }

  return (
    <div className="w-full">
      <Link
        href={ADMIN_EVENTS_HOME}
        className="mb-3.5 inline-flex cursor-pointer items-center gap-1.5 py-1.5 text-[12.5px] font-medium text-[var(--text-mid)] hover:text-[var(--green)]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-[13px] w-[13px]">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to events
      </Link>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-dm-serif)] text-2xl text-[var(--text)]">
            {event.event_name}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--text-light)]">
            {event.event_id} · {event.event_type}
          </p>
        </div>
        <button
          type="button"
          disabled={isDeletePending || isSavePending}
          onClick={handleDelete}
          className="cursor-pointer rounded-[8px] border border-red-200 bg-white px-4 py-2 text-[12px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          {isDeletePending ? "Deleting…" : "Delete event"}
        </button>
      </div>

      <AdminEventTranslatePanel payload={payload} />

      <form
        onSubmit={handleSubmit}
        className="rounded-[14px] border border-[var(--border-light)] bg-white p-6"
      >
        <AdminEventFormFields event={event} idPrefix="edit-" />

        {error ? (
          <p className="mt-4 text-[13px] text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2 border-t border-[var(--border-light)] pt-4">
          <button
            type="submit"
            disabled={isSavePending || isDeletePending}
            className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-5 py-2 text-[12px] font-semibold text-white hover:bg-[#1B4332] disabled:opacity-60"
          >
            {isSavePending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
