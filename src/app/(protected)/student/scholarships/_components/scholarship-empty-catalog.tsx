export function ScholarshipEmptyCatalog() {
  return (
    <div className="mx-auto">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border-light)] bg-white px-8 py-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[var(--sand)] opacity-60"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-[#E8F5EE] opacity-50"
          aria-hidden
        />

        <div className="relative mx-auto mb-6 flex h-[120px] w-[120px] items-center justify-center rounded-2xl bg-gradient-to-br from-[#E8F5EE] to-[#E6F1FB]">
          <ScholarshipIllustration className="h-[72px] w-[72px] text-[#2D6A4F]" />
        </div>

        <h2 className="serif relative mb-2 text-[22px] font-bold leading-tight text-[var(--text)]">
          Scholarships are on the way
        </h2>
        <p className="relative mb-6 text-[15px] leading-relaxed text-[var(--text-mid)]">
          We&apos;re still loading programs into this directory. Once listings go live,
          you&apos;ll be able to search by nationality, destination, and coverage and save
          opportunities you care about.
        </p>
        <p className="relative text-[13px] text-[var(--text-light)]">
          Please check back in a little while. If you think this is a mistake, let your
          school or advisor know.
        </p>
      </div>
    </div>
  );
}

function ScholarshipIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M32 8L8 20v24l24 12 24-12V20L32 8z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M8 20l24 12 24-12M32 32v24"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M22 26l8 4 12-6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.65"
      />
      <circle cx="46" cy="18" r="5" stroke="#185FA5" strokeWidth="1.5" fill="#E6F1FB" />
      <path
        d="M44 18h4M46 16v4"
        stroke="#185FA5"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}
