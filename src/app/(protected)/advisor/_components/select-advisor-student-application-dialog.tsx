"use client";

import type { AdvisorStudentApplicationOption } from "@/lib/advisor-student-application-options";
import { useEffect } from "react";

type SelectAdvisorStudentApplicationDialogProps = {
  open: boolean;
  studentName: string;
  applications: AdvisorStudentApplicationOption[];
  onSelect: (applicationId: number) => void;
  onClose: () => void;
};

export function SelectAdvisorStudentApplicationDialog({
  open,
  studentName,
  applications,
  onSelect,
  onClose,
}: SelectAdvisorStudentApplicationDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="select-advisor-student-application-title"
        className="flex max-h-[min(90vh,520px)] w-full max-w-[440px] flex-col overflow-hidden rounded-[12px] border border-[#e0deda] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#ece9e4] px-6 py-5">
          <div>
            <h2
              id="select-advisor-student-application-title"
              className="font-[family-name:var(--font-dm-serif)] text-[20px] font-semibold text-[#1a1a1a]"
            >
              Select application
            </h2>
            <p className="mt-1 text-[13px] text-[#6a6a6a]">{studentName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-[6px] p-1 text-[#7a7a7a] transition-colors hover:bg-[#f5f4f0] hover:text-[#1a1a1a]"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <ul className="flex-1 space-y-2 overflow-y-auto px-6 py-5">
          {applications.map((application) => (
            <li key={application.applicationId}>
              <button
                type="button"
                onClick={() => onSelect(application.applicationId)}
                className="flex w-full cursor-pointer items-center justify-between rounded-[8px] border border-[#e0deda] bg-[#faf9f4] px-4 py-3 text-left text-[13px] font-medium text-[#1a1a1a] transition-colors hover:border-[var(--green-light)] hover:bg-[var(--green-bg)]"
              >
                {application.label}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-4 w-4 shrink-0 text-[#7a7a7a]"
                  aria-hidden
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
