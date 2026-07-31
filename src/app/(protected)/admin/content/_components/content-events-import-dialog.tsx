"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import type { ImportProgressPayload } from "@/lib/admin-import-progress";
import { postFormImportWithSse } from "@/lib/admin-import-sse";

import { ContentImportProgressBar } from "./content-import-progress-bar";
import {
  ContentImportResultPanel,
  type ContentImportResultSummary,
} from "./content-import-result-panel";

type ContentEventsImportDialogProps = {
  open: boolean;
  onClose: () => void;
};

type ImportSummary = ContentImportResultSummary & {
  eventsUpserted: number;
};

export function ContentEventsImportDialog({
  open,
  onClose,
}: ContentEventsImportDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState<ImportProgressPayload | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shouldRefreshOnClose = useRef(false);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose an Excel (.xlsx) or CSV file to import.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSummary(null);
    setProgress(null);
    shouldRefreshOnClose.current = false;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const payload = await postFormImportWithSse<ImportSummary>(
        "/api/admin/events/import",
        formData,
        {
          onProgress: (p) => setProgress(p),
        },
      );

      setSummary(payload);
      shouldRefreshOnClose.current = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    if (shouldRefreshOnClose.current) {
      router.refresh();
    }
    shouldRefreshOnClose.current = false;
    setSummary(null);
    setError(null);
    setProgress(null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) handleClose();
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[14px] border border-[#ece9e4] bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="events-import-title"
      >
        <h2
          id="events-import-title"
          className="mb-1 text-[16px] font-bold text-[#1a1a1a]"
        >
          Import events
        </h2>
        <p className="mb-5 text-[13px] text-[#7a7a7a]">
          Upload an Excel or CSV file with the Events sheet columns. Rows are
          upserted by <code className="text-[12px]">event_id</code>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            disabled={isSubmitting}
            className="block w-full text-[13px] text-[#4a4a4a] file:mr-3 file:cursor-pointer file:rounded-[8px] file:border-0 file:bg-[#e8f5ee] file:px-4 file:py-2 file:text-[12px] file:font-semibold file:text-[#2D6A4F]"
          />

          {progress ? <ContentImportProgressBar progress={progress} /> : null}
          {summary ? (
            <ContentImportResultPanel summary={summary} entityLabel="events" />
          ) : null}
          {error ? (
            <p className="text-[13px] text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleClose}
              className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a] hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:opacity-60"
            >
              {summary ? "Close" : "Cancel"}
            </button>
            {!summary ? (
              <button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#1B4332] disabled:opacity-60"
              >
                {isSubmitting ? "Importing…" : "Import"}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
