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

type ContentUniversityProgramsImportDialogProps = {
  open: boolean;
  onClose: () => void;
};

type ImportSummary = ContentImportResultSummary & {
  linksUpserted: number;
};

export function ContentUniversityProgramsImportDialog({
  open,
  onClose,
}: ContentUniversityProgramsImportDialogProps) {
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
      setError("Choose an Excel (.xlsx) file to import.");
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
        "/api/admin/university-programs/import",
        formData,
        {
          onProgress: (value) => setProgress(value),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[12px] border border-[#e0deda] bg-white p-6 shadow-xl"
      >
        <h2 className="text-[18px] font-semibold text-[#1a1a1a]">
          Bulk Import University Programs
        </h2>
        <p className="mt-2 text-[13px] text-[#666]">
          Upload an Excel file with a <strong>university_programs</strong> sheet.
          Rows are matched by <strong>program_id</strong> (slug) and{" "}
          <strong>university_name</strong>.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={isSubmitting}
            className="block w-full text-[13px] text-[#4a4a4a] file:mr-3 file:rounded-[8px] file:border file:border-[#e0deda] file:bg-white file:px-3 file:py-2 file:text-[12px] file:font-semibold"
          />

          {isSubmitting ? <ContentImportProgressBar progress={progress} /> : null}
          {error ? <p className="text-[13px] text-red-600">{error}</p> : null}

          {summary ? (
            <ContentImportResultPanel summary={summary} entityLabel="links" />
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a]"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting ? "Importing…" : "Import Excel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
