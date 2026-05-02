"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

function paginationTotals(totalRows: number, page: number, limit: number) {
  const totalPages = Math.max(1, Math.ceil(totalRows / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * limit;
  const rangeStart = totalRows === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(safePage * limit, totalRows);
  return { totalPages, safePage, offset, rangeStart, rangeEnd };
}

const LIMIT_SELECT_CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237a7a7a' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")";

const limitSelectClass =
  "min-h-9 min-w-[72px] cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)] bg-white px-3 py-2 text-[11.5px] leading-none text-[var(--text-mid)] transition-all hover:border-[var(--text-hint)] focus:border-[var(--green-light)] focus:outline-none appearance-none bg-[length:10px_6px] bg-[position:right_10px_center] bg-no-repeat pr-[26px]";

const navButtonClass =
  "inline-flex h-9 min-w-[36px] cursor-pointer items-center justify-center rounded-[var(--radius-pill)] border-[1.5px] border-[var(--border)] bg-white px-2.5 text-[11.5px] font-medium leading-none text-[var(--text)] transition-all hover:border-[var(--green)] hover:bg-[var(--green-pale)] hover:text-[var(--green)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-[var(--border)] disabled:hover:bg-white disabled:hover:text-[var(--text)]";

export type PaginationChangePayload = {
  page: number;
  limit: number;
};

export type PaginationProps = {
  totalRows: number;
  page: number;
  limit: number;
  limitOptions: readonly number[];
  /** Left label: `"range"` (default) = "1–12 of N"; `"total"` = "Total: N" */
  summary?: "range" | "total";
  /** Invoked after the user changes page or limit. */
  onChange?: (next: PaginationChangePayload) => void;
  /**
   * When `true` (default), writes `page` and `limit` onto the current URL while preserving
   * other query params (`router.replace`, `scroll: false`).
   */
  syncSearchParams?: boolean;
  pageParam?: string;
  limitParam?: string;
  className?: string;
};

export function Pagination({
  totalRows,
  page,
  limit,
  limitOptions,
  summary = "range",
  onChange,
  syncSearchParams = true,
  pageParam = "page",
  limitParam = "limit",
  className = "",
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const { totalPages, safePage, rangeStart, rangeEnd } = paginationTotals(
    totalRows,
    page,
    limit,
  );

  const limitChoices = [...new Set([...limitOptions, limit])].sort(
    (a, b) => a - b,
  );

  const commit = useCallback(
    (nextPage: number, nextLimit: number) => {
      const { safePage: sp } = paginationTotals(totalRows, nextPage, nextLimit);

      startTransition(() => {
        if (syncSearchParams) {
          const next = new URLSearchParams(searchParams.toString());
          next.set(pageParam, String(sp));
          next.set(limitParam, String(nextLimit));
          const q = next.toString();
          router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
        }
        onChange?.({ page: sp, limit: nextLimit });
      });
    },
    [
      limitParam,
      onChange,
      pageParam,
      pathname,
      router,
      searchParams,
      syncSearchParams,
      totalRows,
    ],
  );

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 text-[11.5px] text-[var(--text-mid)] ${isPending ? "opacity-75" : ""} ${className}`}
      aria-busy={isPending}
    >
      <p className="tabular-nums">
        {summary === "total" ? (
          <span>
            Total:{" "}
            <span className="text-[var(--text)]">{totalRows}</span>
          </span>
        ) : totalRows === 0 ? (
          <span>No results</span>
        ) : (
          <span>
            <span className="text-[var(--text)]">{rangeStart}</span>
            {"–"}
            <span className="text-[var(--text)]">{rangeEnd}</span>
            {" of "}
            <span className="text-[var(--text)]">{totalRows}</span>
          </span>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2">
          <span className="whitespace-nowrap text-[var(--text-light)]">
            Per page
          </span>
          <select
            aria-label="Rows per page"
            className={limitSelectClass}
            style={{ backgroundImage: LIMIT_SELECT_CHEVRON }}
            value={String(limit)}
            onChange={(e) => {
              const nextLimit = Number.parseInt(e.target.value, 10);
              if (!Number.isFinite(nextLimit) || nextLimit < 1) return;
              commit(1, nextLimit);
            }}
          >
            {limitChoices.map((n) => (
              <option key={n} value={String(n)}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <span className="tabular-nums text-[var(--text-light)]">
          Page <span className="text-[var(--text)]">{safePage}</span> /{" "}
          {totalPages}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className={navButtonClass}
            aria-label="Previous page"
            disabled={safePage <= 1 || totalRows === 0}
            onClick={() => commit(safePage - 1, limit)}
          >
            Prev
          </button>
          <button
            type="button"
            className={navButtonClass}
            aria-label="Next page"
            disabled={safePage >= totalPages || totalRows === 0}
            onClick={() => commit(safePage + 1, limit)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
