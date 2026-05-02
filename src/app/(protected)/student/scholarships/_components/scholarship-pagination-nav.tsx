"use client";

import Link from "next/link";

type Props = {
  hrefForPage: (page: number) => string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  ariaLabel: string;
};

export function ScholarshipPaginationNav({
  hrefForPage,
  currentPage,
  totalPages,
  totalItems,
  ariaLabel,
}: Props) {
  if (totalItems === 0) return null;

  const prev = currentPage > 1 ? currentPage - 1 : null;
  const next = currentPage < totalPages ? currentPage + 1 : null;

  return (
    <nav
      className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-light)] pt-4 text-[13px] text-[var(--text-mid)]"
      aria-label={ariaLabel}
    >
      <span className="text-[var(--text-light)]">
        Page {currentPage} of {totalPages} ({totalItems} total)
      </span>
      <div className="flex gap-2">
        {prev ? (
          <Link
            href={hrefForPage(prev)}
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-3 py-1.5 font-medium text-[var(--text)] hover:bg-[var(--sand)]"
            prefetch={false}
          >
            Previous
          </Link>
        ) : (
          <span className="rounded-[var(--radius-sm)] border border-transparent px-3 py-1.5 text-[var(--text-hint)]">
            Previous
          </span>
        )}
        {next ? (
          <Link
            href={hrefForPage(next)}
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-3 py-1.5 font-medium text-[var(--text)] hover:bg-[var(--sand)]"
            prefetch={false}
          >
            Next
          </Link>
        ) : (
          <span className="rounded-[var(--radius-sm)] border border-transparent px-3 py-1.5 text-[var(--text-hint)]">
            Next
          </span>
        )}
      </div>
    </nav>
  );
}
