import { Loader2 } from "lucide-react";

export default function ScholarshipsLoading() {
  return (
    <div className="mx-auto w-full px-2 pb-16 pt-0">
      <header className="mb-6">
        <div className="mb-1 h-[30px] w-52 animate-pulse rounded bg-[var(--sand)]" />
        <div className="h-4 w-80 animate-pulse rounded bg-[var(--sand)]" />
      </header>

      <div className="mb-5 rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white px-6 py-[18px]">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="h-5 w-12 animate-pulse rounded bg-[var(--sand)]" />
          <div className="h-10 w-[160px] animate-pulse rounded-[var(--radius-sm)] bg-[var(--sand)]" />
          <div className="h-5 w-24 animate-pulse rounded bg-[var(--sand)]" />
          <div className="h-10 w-[160px] animate-pulse rounded-[var(--radius-sm)] bg-[var(--sand)]" />
          <div className="h-5 w-20 animate-pulse rounded bg-[var(--sand)]" />
          <div className="h-10 w-[160px] animate-pulse rounded-[var(--radius-sm)] bg-[var(--sand)]" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 py-14">
        <Loader2
          className="size-8 animate-spin text-[var(--green)]"
          aria-hidden
        />
        <p className="text-[13px] text-[var(--text-light)]">
          Loading scholarships…
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[140px] animate-pulse rounded-[var(--radius)] border border-[var(--border-light)] bg-[var(--sand)]"
          />
        ))}
      </div>
    </div>
  );
}
