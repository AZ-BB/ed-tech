export default function AdminDocumentsLoading() {
  return (
    <div role="status" aria-live="polite">
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white">
        <div className="border-b border-[var(--border-light)] px-5 py-4">
          <div className="h-5 w-40 animate-pulse rounded bg-[#ece9e4]" />
          <div className="mt-2 h-3 w-72 animate-pulse rounded bg-[#ece9e4]" />
        </div>

        <div className="flex flex-wrap gap-2 border-b border-[var(--border-light)] bg-[#faf9f4] px-5 py-3.5">
          <div className="h-9 min-w-[200px] flex-1 animate-pulse rounded-lg bg-[#ece9e4]" />
          <div className="h-9 w-[120px] animate-pulse rounded-lg bg-[#ece9e4]" />
          <div className="h-9 w-[160px] animate-pulse rounded-lg bg-[#ece9e4]" />
        </div>

        <div className="px-5 py-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="mb-2 h-12 animate-pulse rounded bg-[#f4f3f0]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
