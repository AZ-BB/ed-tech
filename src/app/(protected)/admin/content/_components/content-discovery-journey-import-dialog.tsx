"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type ContentDiscoveryJourneyImportDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function ContentDiscoveryJourneyImportDialog({
  open,
  onClose,
}: ContentDiscoveryJourneyImportDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shouldRefreshOnClose = useRef(false);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a JSON file to import.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    shouldRefreshOnClose.current = false;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/discovery-journey/import", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        details?: Array<{ path: string; message: string }>;
        moduleCount?: number;
        version?: number;
      };

      if (!response.ok) {
        const detailText = payload.details?.length
          ? `\n${payload.details.map((d) => `${d.path}: ${d.message}`).join("\n")}`
          : "";
        throw new Error(`${payload.error ?? "Import failed."}${detailText}`);
      }

      setMessage(
        `Imported ${payload.moduleCount ?? 0} module(s). Config version: ${payload.version ?? "—"}.`,
      );
      shouldRefreshOnClose.current = true;
    } catch (err) {
      const text = err instanceof Error ? err.message : "Import failed.";
      setError(text);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    if (shouldRefreshOnClose.current) {
      router.refresh();
    }
    shouldRefreshOnClose.current = false;
    setMessage(null);
    setError(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="content-discovery-journey-import-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[12px] border border-[#e0deda] bg-white p-6 shadow-xl"
      >
        <h2
          id="content-discovery-journey-import-title"
          className="text-[18px] font-semibold text-[#1a1a1a]"
        >
          Import Discovery Journey JSON
        </h2>
        <p className="mt-2 text-[13px] text-[#666]">
          Upload a JSON file with <code>scales</code>, <code>tests</code>,{" "}
          <code>combined_profiles</code>, and <code>scoring_rules</code>. This replaces all
          discovery modules and global settings. Existing student results are preserved.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="file"
            accept=".json,application/json"
            disabled={isSubmitting}
            className="block w-full text-[13px] text-[#4a4a4a] file:mr-3 file:rounded-[8px] file:border file:border-[#e0deda] file:bg-white file:px-3 file:py-2 file:text-[12px] file:font-semibold file:text-[#4a4a4a] disabled:opacity-60"
          />

          {error ? <p className="whitespace-pre-wrap text-[13px] text-red-600">{error}</p> : null}
          {message ? <p className="text-[13px] text-[#2D6A4F]">{message}</p> : null}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="rounded-[8px] border border-[#e0deda] px-4 py-2 text-[12px] font-semibold text-[#4a4a4a]"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting ? "Importing…" : "Import JSON"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
