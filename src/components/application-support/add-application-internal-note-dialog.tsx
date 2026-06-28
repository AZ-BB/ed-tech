"use client";

import { useEffect, useState } from "react";

import type { ApplicationNoteVisibility } from "@/lib/application-internal-notes";

type AddApplicationInternalNoteDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (content: string, visibility: ApplicationNoteVisibility) => void;
  isSubmitting: boolean;
  error: string | null;
};

const textareaClassName =
  "w-full resize-y rounded-[8px] border border-[#e0deda] bg-white px-3 py-2.5 text-[13px] text-[#1a1a1a] outline-none transition-colors placeholder:text-[#9a9a9a] focus:border-[#40916C] disabled:opacity-60";

export function AddApplicationInternalNoteDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}: AddApplicationInternalNoteDialogProps) {
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<ApplicationNoteVisibility>("internal");

  useEffect(() => {
    if (open) {
      setContent("");
      setVisibility("internal");
    }
  }, [open]);

  if (!open) return null;

  function handleSubmit() {
    onSubmit(content.trim(), visibility);
  }

  const visibilityHint =
    visibility === "public"
      ? "Also visible to the student's school counselors in the Teacher Portal."
      : "Visible to platform admins and the assigned advisor only.";

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(15,30,20,0.45)] p-4"
      role="presentation"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-application-note-title"
        className="w-full max-w-[480px] rounded-[12px] border border-[#ece9e4] bg-white p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h3
          id="add-application-note-title"
          className="text-[15px] font-semibold text-[var(--text)]"
        >
          Add note
        </h3>
        <p className="mt-1 text-[12px] text-[var(--text-light)]">
          Application support note for admins, advisors, and optionally school counselors.
        </p>

        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={5}
          maxLength={8000}
          placeholder="Add a note… (Cmd+Enter to save)"
          disabled={isSubmitting}
          autoFocus
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !isSubmitting) {
              event.preventDefault();
              handleSubmit();
            }
          }}
          className={`${textareaClassName} mt-4`}
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-[5px]">
            {(["internal", "public"] as const).map((option) => {
              const active = visibility === option;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setVisibility(option)}
                  className={`cursor-pointer rounded-[8px] border px-[9px] py-1 text-[11px] font-medium capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
                    active
                      ? "border-[var(--green-light)] bg-[var(--green-pale)] text-[var(--green-dark)]"
                      : "border-[var(--border)] bg-white text-[var(--text-mid)]"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-[var(--text-hint)]">{visibilityHint}</p>
        </div>

        {error ? (
          <p className="mt-2 text-[12px] font-medium text-[#8c2d22]">{error}</p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[var(--green-light)] hover:text-[var(--green-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || !content.trim()}
            onClick={handleSubmit}
            className="cursor-pointer rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-4 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Saving…" : "Add note"}
          </button>
        </div>
      </div>
    </div>
  );
}
