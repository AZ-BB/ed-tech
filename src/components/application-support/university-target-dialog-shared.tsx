"use client";

import { useEffect, type ReactNode } from "react";

export const universityDialogInputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C] disabled:opacity-60";

export const universityDialogLabelClassName =
  "mb-1.5 block text-[12px] font-semibold text-[#4a4a4a]";

export const universityDialogSelectClassName = `${universityDialogInputClassName} cursor-pointer appearance-none bg-[length:10px_6px] bg-[position:right_10px_center] bg-no-repeat pr-9`;

export const UNIVERSITY_DIALOG_SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

export type UniversityTargetFormState = {
  universityId: string;
  universityName: string;
  program: string;
  countryCode: string;
  deadline: string;
  portalUrl: string;
  status: string;
  decision: string;
  notes: string;
  documentNames: string[];
};

export function defaultUniversityTargetFormState(): UniversityTargetFormState {
  return {
    universityId: "",
    universityName: "",
    program: "",
    countryCode: "",
    deadline: "",
    portalUrl: "",
    status: "advisor_recommended",
    decision: "not_submitted",
    notes: "",
    documentNames: [""],
  };
}

export function universityTargetToFormState(target: {
  universityId: string | null;
  universityName: string;
  program: string | null;
  countryCode: string | null;
  deadline: string | null;
  portalUrl: string | null;
  status: string;
  decision: string;
  notes: string | null;
}): UniversityTargetFormState {
  return {
    universityId: target.universityId ?? "",
    universityName: target.universityName,
    program: target.program ?? "",
    countryCode: target.countryCode ?? "",
    deadline: target.deadline ?? "",
    portalUrl: target.portalUrl ?? "",
    status: target.status,
    decision: target.decision,
    notes: target.notes ?? "",
    documentNames: [""],
  };
}

type UniversityTargetDialogShellProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  isSubmitting: boolean;
  error: string | null;
  children: ReactNode;
  footer: ReactNode;
  maxWidthClass?: string;
};

export function UniversityTargetDialogShell({
  open,
  title,
  subtitle,
  onClose,
  isSubmitting,
  error,
  children,
  footer,
  maxWidthClass = "max-w-[620px]",
}: UniversityTargetDialogShellProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, isSubmitting]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={isSubmitting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`flex max-h-[min(92vh,780px)] w-full ${maxWidthClass} flex-col overflow-hidden rounded-[12px] border border-[#e0deda] bg-white shadow-xl`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#ece9e4] px-6 py-5">
          <div>
            <h2 className="font-[family-name:var(--font-dm-serif)] text-[20px] font-semibold text-[#1a1a1a]">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-[12px] text-[#7a7a7a]">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="cursor-pointer rounded-[6px] p-1 text-[#7a7a7a] transition-colors hover:bg-[#f5f4f0] hover:text-[#1a1a1a] disabled:opacity-60"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {error ? (
          <p className="shrink-0 border-t border-[#ece9e4] px-6 py-2 text-[12px] text-[#c0392b]">
            {error}
          </p>
        ) : null}

        <div className="flex shrink-0 justify-end gap-2 border-t border-[#ece9e4] bg-[#f5f4f0] px-6 py-4">
          {footer}
        </div>
      </div>
    </div>
  );
}
