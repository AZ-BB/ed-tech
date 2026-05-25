"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type UsersCsvImportDialogProps = {
  open: boolean;
  title: string;
  endpoint: string;
  onClose: () => void;
};

type ImportSummary = {
  created: number;
  skipped: number;
  failed: number;
  errors: string[];
};

export function UsersCsvImportDialog({
  open,
  title,
  endpoint,
  onClose,
}: UsersCsvImportDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as ImportSummary & { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Import failed.");
        return;
      }

      setSummary(payload);
      router.refresh();
    } catch {
      setError("Import failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    setSummary(null);
    setError(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="users-csv-import-title"
        className="w-full max-w-lg rounded-[12px] border border-[#e0deda] bg-white p-6 shadow-xl"
      >
        <h2 id="users-csv-import-title" className="text-[18px] font-semibold text-[#1a1a1a]">
          {title}
        </h2>
        <p className="mt-2 text-[13px] text-[#666]">
          Upload an Excel file (.xlsx) that matches the sample template. Existing users with the
          same email and name are skipped. CSV is also accepted.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="block w-full text-[13px] text-[#4a4a4a] file:mr-3 file:rounded-[8px] file:border file:border-[#e0deda] file:bg-white file:px-3 file:py-2 file:text-[12px] file:font-semibold file:text-[#4a4a4a]"
          />

          {error ? <p className="text-[13px] text-red-600">{error}</p> : null}

          {summary ? (
            <div className="rounded-[8px] border border-[#e0deda] bg-[#faf9f7] p-3 text-[13px] text-[#4a4a4a]">
              <p>Created: {summary.created}</p>
              <p>Skipped (duplicates): {summary.skipped}</p>
              <p>Failed: {summary.failed}</p>
              {summary.errors.length > 0 ? (
                <ul className="mt-2 max-h-32 list-disc overflow-y-auto pl-5">
                  {summary.errors.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
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
