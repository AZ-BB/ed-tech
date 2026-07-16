"use client";

import type { AdvisorActivePackagesPanelProps } from "@/app/(protected)/advisor/packages/_lib/fetch-advisor-active-packages-page";
import { Pagination } from "@/components/pagination";
import { format } from "date-fns";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

const PACKAGES_LIMIT_OPTIONS = [10, 20, 50] as const;

function formatPaidOn(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "d MMM yyyy");
  } catch {
    return "—";
  }
}

function statusBadgeClass(label: "Active" | "Submitted"): string {
  if (label === "Submitted") {
    return "bg-[#dbeafe] text-[#1e40af]";
  }
  return "bg-[var(--green-bg)] text-[var(--green-dark)]";
}

export function AdvisorActivePackagesTable({
  rows,
  totalRows,
  page,
  limit,
  search,
}: AdvisorActivePackagesPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const applySearch = useCallback(
    (value: string) => {
      startTransition(() => {
        const next = new URLSearchParams(searchParams.toString());
        const trimmed = value.trim();
        if (trimmed) {
          next.set("search", trimmed);
        } else {
          next.delete("search");
        }
        next.set("packagesPage", "1");
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (searchInput.trim() === search.trim()) return;
      applySearch(searchInput);
    }, 300);

    return () => window.clearTimeout(handle);
  }, [searchInput, search, applySearch]);

  const countLabel =
    totalRows === 1 ? "1 active package" : `${totalRows} active packages`;

  return (
    <div
      className={`overflow-hidden rounded-[14px] border border-[var(--border-light)] bg-white ${isPending ? "opacity-75" : ""}`}
      aria-busy={isPending}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-light)] px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-[10px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[var(--text-hint)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search active packages..."
              className="w-[240px] max-w-full rounded-[8px] border-[1.5px] border-[var(--border)] bg-[#faf9f4] py-[7px] pl-8 pr-3 text-[12.5px] text-[var(--text)] outline-none transition-colors focus:border-[var(--green-light)] focus:bg-white"
            />
          </div>
          <span className="inline-flex rounded-full border border-[var(--border-light)] bg-[#faf9f4] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-mid)]">
            {countLabel}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Package purchased</th>
              <th className="px-4 py-3">Amount paid</th>
              <th className="px-4 py-3">Paid on</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-[var(--text-light)]"
                >
                  {search.trim()
                    ? "No active packages match your search."
                    : "No active packages yet. Packages appear here after a student completes payment."}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const detailHref = `/advisor/applications/${row.id}?from=packages`;

                function openDetail() {
                  router.push(detailHref);
                }

                return (
                <tr
                  key={row.id}
                  className="cursor-pointer border-t border-[var(--border-light)] transition-colors hover:bg-[#faf9f4]"
                  onClick={openDetail}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openDetail();
                    }
                  }}
                  tabIndex={0}
                  role="link"
                  aria-label={`View application for ${row.studentName}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5 text-[var(--text)]">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] text-[11.5px] font-bold text-[var(--green-dark)]">
                        {row.studentInitials}
                      </span>
                      <span className="font-semibold">{row.studentName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-light)]">
                    {row.studentEmail}
                  </td>
                  <td className="px-4 py-3 text-[var(--text)]">
                    {row.packagePurchased}
                  </td>
                  <td className="px-4 py-3 font-semibold text-[var(--text)]">
                    AED {row.amountPaidAed.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-light)]">
                    {formatPaidOn(row.paidOn)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusBadgeClass(row.statusLabel)}`}
                    >
                      {row.statusLabel}
                    </span>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-[var(--border-light)] px-4 py-3">
        <Pagination
          totalRows={totalRows}
          page={page}
          limit={limit}
          limitOptions={PACKAGES_LIMIT_OPTIONS}
          pageParam="packagesPage"
          limitParam="packagesLimit"
        />
      </div>
    </div>
  );
}
