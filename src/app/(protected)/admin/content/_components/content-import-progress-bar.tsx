"use client";

import type { ImportProgressPayload } from "@/lib/admin-import-progress";

type ContentImportProgressBarProps = {
  progress: ImportProgressPayload | null;
};

export function ContentImportProgressBar({ progress }: ContentImportProgressBarProps) {
  if (!progress || progress.total <= 0) {
    return (
      <div className="rounded-[8px] border border-[#e0deda] bg-[#faf9f7] p-3">
        <p className="text-[13px] text-[#666]">Preparing import…</p>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((progress.current / progress.total) * 100));

  return (
    <div className="rounded-[8px] border border-[#e0deda] bg-[#faf9f7] p-3">
      <div className="flex items-center justify-between gap-2 text-[13px]">
        <span className="font-medium text-[#1a1a1a]">{progress.phaseLabel}</span>
        <span className="tabular-nums text-[#666]">
          {progress.current} / {progress.total}
        </span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-[#e8e5e0]"
        role="progressbar"
        aria-valuenow={progress.current}
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-label={`${progress.phaseLabel}: ${progress.current} of ${progress.total}`}
      >
        <div
          className="h-full rounded-full bg-[#2D6A4F] transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[12px] text-[#666]">{pct}% complete</p>
    </div>
  );
}
