import { Loader2 } from "lucide-react";

export default function ScholarshipsLoading() {
  return (
    <div className="w-full min-w-0 max-w-full overflow-x-clip pb-16 pt-0">
      <header className="mb-6">
        <div className="mb-1 h-[30px] w-52 animate-pulse rounded bg-[var(--sand)]" />
        <div className="h-4 w-80 animate-pulse rounded bg-[var(--sand)]" />
      </header>

      <div className="mb-5 rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white px-4 py-4 md:px-6 md:py-[18px]">
        <div className="flex flex-col gap-2.5 md:flex-row md:flex-wrap md:items-center">
          <div className="h-5 w-12 animate-pulse rounded bg-[var(--sand)]" />
          <div className="h-10 w-[160px] animate-pulse rounded-[var(--radius-pill)] bg-[var(--sand)]" />
          <div className="h-5 w-24 animate-pulse rounded bg-[var(--sand)]" />
          <div className="h-10 w-[160px] animate-pulse rounded-[var(--radius-pill)] bg-[var(--sand)]" />
          <div className="h-5 w-20 animate-pulse rounded bg-[var(--sand)]" />
          <div className="h-10 w-[160px] animate-pulse rounded-[var(--radius-pill)] bg-[var(--sand)]" />
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

      <div className="grid min-w-0 grid-cols-1 gap-3.5 md:grid-cols-2">
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
