function WebinarsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-8 w-8"
      aria-hidden
    >
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  );
}

export default function SchoolWebinarsPage() {
  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--border-light)] bg-white">
      <div className="flex flex-col items-center px-6 py-14 text-center sm:py-16">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--green-pale)] text-[var(--green)]">
          <WebinarsIcon />
        </div>
        <h2 className="mb-1.5 text-[14px] font-semibold text-[var(--text)]">
          Webinars (coming soon)
        </h2>
        <p className="max-w-md text-[13px] leading-relaxed text-[var(--text-mid)]">
          Browse upcoming and past Univeera webinars your students can attend.
        </p>
      </div>
    </div>
  );
}
