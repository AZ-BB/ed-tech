"use client";

type EventEmptyCatalogProps = {
  onReset: () => void;
  labels: {
    title: string;
    description: string;
    viewAll: string;
  };
};

export function EventEmptyCatalog({ onReset, labels }: EventEmptyCatalogProps) {
  return (
    <div className="animate-[fadeEmptyIn_0.3s_ease] py-12 text-center">
      <div className="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[var(--green-pale)]">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a0a0a0" strokeWidth="1.5" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
      <h2 className="mb-2 font-[family-name:var(--font-dm-serif)] text-[20px] text-[var(--text)]">
        {labels.title}
      </h2>
      <p className="mx-auto mb-5 max-w-md text-[13px] leading-relaxed text-[var(--text-light)]">
        {labels.description}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="rounded-full bg-[var(--green)] px-6 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[var(--green-dark)]"
      >
        {labels.viewAll}
      </button>
    </div>
  );
}
