"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type ContentUniversitiesImportDialogProps = {
  open: boolean;
  onClose: () => void;
};

type ImportSummary = {
  processed: number;
  universitiesUpserted: number;
  errors: { rowNumber: number; message: string }[];
};

async function parseImportResponse(response: Response): Promise<
  ImportSummary & { error?: string }
> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error("Empty response from server.");
  }

  try {
    return JSON.parse(text) as ImportSummary & { error?: string };
  } catch {
    throw new Error("Invalid response from server.");
  }
}

export function ContentUniversitiesImportDialog({
  open,
  onClose,
}: ContentUniversitiesImportDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    shouldRefreshOnClose.current = false;

    const clientLog = "[admin-universities-import-client]";
    const startedAt = Date.now();

    try {
      const formData = new FormData();
      formData.append("file", file);

      console.log(`${clientLog} fetch start`, {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      const response = await fetch("/api/admin/universities/import", {
        method: "POST",
        body: formData,
      });

      console.log(`${clientLog} fetch response`, {
        elapsedMs: Date.now() - startedAt,
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get("content-type"),
      });

      const payload = await parseImportResponse(response);

      console.log(`${clientLog} response parsed`, {
        elapsedMs: Date.now() - startedAt,
        ok: response.ok,
        processed: "processed" in payload ? payload.processed : undefined,
        error: payload.error,
      });

      if (!response.ok) {
        setError(payload.error ?? "Import failed.");
        return;
      }

      setSummary(payload);
      shouldRefreshOnClose.current = true;
    } catch (err) {
      console.error(`${clientLog} fetch failed`, {
        elapsedMs: Date.now() - startedAt,
        error: err,
      });
      const message = err instanceof Error ? err.message : "Import failed.";
      setError(message);
    } finally {
      console.log(`${clientLog} done`, { elapsedMs: Date.now() - startedAt });
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
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="content-universities-import-title"
        className="w-full max-w-lg rounded-[12px] border border-[#e0deda] bg-white p-6 shadow-xl"
      >
        <h2
          id="content-universities-import-title"
          className="text-[18px] font-semibold text-[#1a1a1a]"
        >
          Bulk Import Universities
        </h2>
        <p className="mt-2 text-[13px] text-[#666]">
          Upload an Excel file (.xlsx) that matches the sample template. Universities are upserted
          by name; duplicate names in the same file are skipped. Large files may take up to a
          minute. CSV is also accepted.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            disabled={isSubmitting}
            className="block w-full text-[13px] text-[#4a4a4a] file:mr-3 file:rounded-[8px] file:border file:border-[#e0deda] file:bg-white file:px-3 file:py-2 file:text-[12px] file:font-semibold file:text-[#4a4a4a] disabled:opacity-60"
          />

          {isSubmitting ? (
            <p className="text-[13px] text-[#666]">Importing… this may take a little while.</p>
          ) : null}

          {error ? <p className="text-[13px] text-red-600">{error}</p> : null}

          {summary ? (
            <div className="rounded-[8px] border border-[#e0deda] bg-[#faf9f7] p-3 text-[13px] text-[#4a4a4a]">
              <p>Rows processed: {summary.processed}</p>
              <p>Universities upserted: {summary.universitiesUpserted}</p>
              {summary.errors.length > 0 ? (
                <ul className="mt-2 max-h-32 list-disc overflow-y-auto pl-5">
                  {summary.errors.map((item) => (
                    <li key={`${item.rowNumber}-${item.message}`}>
                      Row {item.rowNumber}: {item.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a] disabled:opacity-60"
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
