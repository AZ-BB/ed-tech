"use client";

import type { ReactNode } from "react";

function LockIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

export function QuickActionLockBadge() {
  return (
    <span
      className="absolute right-2.5 top-2.5 flex h-[22px] w-[22px] items-center justify-center rounded-[7px] border border-[var(--border-light)] bg-[#f2f0ec] text-[var(--text-hint)] transition-all group-hover:border-[var(--border)] group-hover:bg-white group-hover:text-[var(--text-mid)]"
      aria-hidden
    >
      <LockIcon size={11} />
    </span>
  );
}

export function QuickActionFreeBadge({ label }: { label: string }) {
  return (
    <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-[var(--green)] px-2.5 py-[3px] text-[9.5px] font-bold uppercase leading-snug tracking-[0.4px] text-white">
      {label}
    </span>
  );
}

type DashboardLockedSectionProps = {
  locked: boolean;
  title: string;
  subtitle: string;
  ariaLabel: string;
  onUnlock: () => void;
  children: ReactNode;
  className?: string;
};

export function DashboardLockedSection({
  locked,
  title,
  subtitle,
  ariaLabel,
  onUnlock,
  children,
  className,
}: DashboardLockedSectionProps) {
  if (!locked) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`relative rounded-2xl ${className ?? ""}`}>
      <button
        type="button"
        className="absolute inset-0 z-[5] flex cursor-pointer items-center justify-center rounded-2xl bg-[rgba(244,243,240,0.35)]"
        onClick={onUnlock}
        aria-label={ariaLabel}
      >
        <span className="flex flex-col items-center gap-2.5 rounded-2xl border border-[var(--border)] bg-white px-[34px] py-[22px] shadow-[0_8px_30px_rgba(15,30,20,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(15,30,20,0.16)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--green-bg)] text-[var(--green)]">
            <LockIcon size={18} />
          </span>
          <span className="text-sm font-semibold text-[var(--text)]">{title}</span>
          <span className="-mt-1 text-[11.5px] text-[var(--text-light)]">
            {subtitle}
          </span>
        </span>
      </button>
      <div className="pointer-events-none select-none opacity-65 blur-[1.5px]">
        {children}
      </div>
    </div>
  );
}
