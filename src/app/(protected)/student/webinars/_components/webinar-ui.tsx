export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className={`transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function WebinarRegistrationProgress({
  registered,
  capacity,
  variant = "card",
}: {
  registered: number;
  capacity: number;
  variant?: "card" | "featured";
}) {
  const pct = capacity > 0 ? Math.round((registered / capacity) * 100) : 0;

  if (variant === "featured") {
    return (
      <div className="rounded-[14px] bg-white p-[18px]">
        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[1px] text-[var(--text-hint)] font-[family-name:var(--font-dm-sans)]">
          Registration
        </p>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="font-[family-name:var(--font-dm-serif)] text-[28px] leading-none text-[var(--green)]">
            {registered}
          </span>
          <span className="text-[13px] font-medium text-[var(--text-light)]">
            of {capacity} seats
          </span>
        </div>
        <div className="mb-2 h-2 overflow-hidden rounded bg-[var(--border-light)]">
          <div
            className="h-full rounded bg-gradient-to-r from-[var(--green-light)] to-[var(--green)]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-[11.5px] text-[var(--text-light)]">
          {Math.max(capacity - registered, 0)} seats remaining
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-2 flex items-baseline justify-between text-[11.5px]">
        <span className="font-semibold text-[var(--text)]">
          {registered} / {capacity} registered
        </span>
        <span className="font-medium text-[var(--text-hint)]">
          {Math.max(capacity - registered, 0)} seats left
        </span>
      </div>
      <div className="h-[5px] overflow-hidden rounded-[3px] bg-[var(--border-light)]">
        <div
          className="h-full rounded-[3px] bg-[var(--green)] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </>
  );
}
