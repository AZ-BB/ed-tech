import { Loader2 } from "lucide-react";

export default function InternshipsLoading() {
  return (
    <div className="internships-page mx-auto w-full min-w-0 max-w-[1100px] overflow-x-clip px-0 pb-16 pt-0">
      <header className="mb-6">
        <div className="mb-1 h-[30px] w-52 max-w-full animate-pulse rounded bg-[var(--sand)]" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-[var(--sand)]" />
      </header>

      <div className="mb-5 rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white px-4 py-4 md:px-6 md:py-[18px]">
        <div className="flex flex-col gap-2.5 md:flex-row md:flex-wrap md:items-center">
          <div className="h-5 w-16 animate-pulse rounded bg-[var(--sand)]" />
          <div className="h-10 w-[170px] animate-pulse rounded-[8px] bg-[var(--sand)]" />
          <div className="h-5 w-24 animate-pulse rounded bg-[var(--sand)]" />
          <div className="h-10 w-[170px] animate-pulse rounded-[8px] bg-[var(--sand)]" />
        </div>
      </div>

      <div className="mb-6 h-[88px] animate-pulse rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-[var(--sand)]" />

      <div className="flex flex-col items-center gap-3 py-14">
        <Loader2
          className="size-8 animate-spin text-[var(--green)]"
          aria-hidden
        />
        <p className="text-[13px] text-[var(--text-light)]">
          Loading internships…
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3.5 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[180px] animate-pulse rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-[var(--sand)]"
          />
        ))}
      </div>
    </div>
  );
}
