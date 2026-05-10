"use client";

import type { ReactNode } from "react";

export function ModalVeil({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(15,30,20,0.5)] p-5"
      role="dialog"
      aria-modal
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-[14px] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--border-light)] px-[22px] py-4">
          <h2 className="font-[family-name:var(--font-dm-serif)] text-xl tracking-tight">{title}</h2>
          <button
            type="button"
            className="rounded-md p-1.5 text-[var(--text-light)] hover:bg-[var(--cream)]"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-[22px] py-[18px]">{children}</div>
      </div>
    </div>
  );
}
