"use client";

type Props = {
  onOpen: () => void;
};

export function RequestSpecificAmbassadorCta({ onOpen }: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="mb-5 flex cursor-pointer items-center gap-3.5 rounded-2xl border border-[var(--border-light)] bg-white px-5 py-4 transition hover:border-[var(--green-light)] hover:shadow-[0_2px_8px_rgba(45,106,79,0.06)] max-sm:flex-col max-sm:items-start max-sm:gap-3"
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--green-bg)] text-[var(--green)]"
        aria-hidden
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
          <path d="M11 8v6M8 11h6" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold leading-snug text-[var(--text)]">
          Can&apos;t find the right ambassador?
        </div>
        <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--text-light)]">
          Tell us who you&apos;re looking for and we&apos;ll do our best to match you.
        </p>
      </div>
      <button
        type="button"
        className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[50px] bg-[var(--green)] px-[18px] py-2.5 text-[12.5px] font-semibold text-white shadow-[0_2px_8px_rgba(45,106,79,0.15)] transition hover:bg-[var(--green-dark)] hover:-translate-y-px max-sm:w-full max-sm:justify-center"
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
      >
        Request a Specific Ambassador
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}
