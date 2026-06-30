"use client";

import { useLocale } from "@/lib/i18n/locale-context";
type Props = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  ariaLabel: string;
  onPageChange?: (page: number) => void;
  /** @deprecated – kept for backward compat; ignored when onPageChange is set */
  hrefForPage?: (page: number) => string;
};

export function ScholarshipPaginationNav({
  currentPage,
  totalPages,
  totalItems,
  ariaLabel,
  onPageChange,
}: Props) {
  const { dict } = useLocale();
  const t = dict.student.scholarships;
  if (totalItems === 0) return null;

  const prev = currentPage > 1 ? currentPage - 1 : null;
  const next = currentPage < totalPages ? currentPage + 1 : null;

  return (
    <nav
      className="mt-4 flex min-w-0 flex-col gap-3 border-t border-[var(--border-light)] pt-4 text-[13px] text-[var(--text-mid)] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2"
      aria-label={ariaLabel}
    >
      <span className="text-[var(--text-light)]">
        {t.pageOf
          .replace("{current}", String(currentPage))
          .replace("{total}", String(totalPages))
          .replace("{items}", String(totalItems))}
      </span>
      <div className="flex w-full gap-2 sm:w-auto">
        {prev ? (
          <button
            type="button"
            onClick={() => onPageChange?.(prev)}
            className="flex-1 cursor-pointer rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-3 py-1.5 text-center font-medium text-[var(--text)] hover:bg-[var(--sand)] sm:flex-none"
          >
            {t.previous}
          </button>
        ) : (
          <span className="rounded-[var(--radius-sm)] border border-transparent px-3 py-1.5 text-[var(--text-hint)]">
            {t.previous}
          </span>
        )}
        {next ? (
          <button
            type="button"
            onClick={() => onPageChange?.(next)}
            className="flex-1 cursor-pointer rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-3 py-1.5 text-center font-medium text-[var(--text)] hover:bg-[var(--sand)] sm:flex-none"
          >
            {t.next}
          </button>
        ) : (
          <span className="rounded-[var(--radius-sm)] border border-transparent px-3 py-1.5 text-[var(--text-hint)]">
            {t.next}
          </span>
        )}
      </div>
    </nav>
  );
}
