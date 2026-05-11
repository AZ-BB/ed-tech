"use client";

import type { ReactNode } from "react";

export function SchoolStudentPanel({
  head,
  sub,
  actions,
  children,
  className = "",
}: {
  head: string;
  sub?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mb-[18px] overflow-hidden rounded-[14px] border border-[var(--border-light)] bg-white ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-light)] px-5 py-[18px]">
        <div>
          <div className="text-[15px] font-semibold tracking-tight text-[var(--text)]">
            {head}
          </div>
          {sub ? (
            <div className="mt-0.5 text-[12px] text-[var(--text-light)]">
              {sub}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
      <div className="px-5 py-[18px]">{children}</div>
    </div>
  );
}
