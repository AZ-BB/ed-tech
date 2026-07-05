"use client";

import type {
  AdvisorSessionsAndCallsPanelProps,
  AdvisorSessionsAndCallsTypeFilter,
} from "@/app/(protected)/advisor/sessions-and-calls/_lib/fetch-advisor-sessions-and-calls-page";
import { Pagination } from "@/components/pagination";
import { format } from "date-fns";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

const SESSIONS_LIMIT_OPTIONS = [10, 20, 50] as const;

const TYPE_OPTIONS: {
  value: AdvisorSessionsAndCallsTypeFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "application_lead", label: "Lead call" },
  { value: "advisor_session", label: "Advisor session" },
];

function formatMeetingDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "d MMM yyyy · h:mm a");
  } catch {
    return "—";
  }
}

function kindBadgeClass(kind: "application_lead" | "advisor_session"): string {
  return kind === "application_lead"
    ? "bg-[#FFF3E0] text-[#E67E22]"
    : "bg-[#E8F5EE] text-[#2D6A4F]";
}

function kindLabel(kind: "application_lead" | "advisor_session"): string {
  return kind === "application_lead" ? "Lead call" : "Advisor session";
}

function rowHref(kind: "application_lead" | "advisor_session", id: string): string {
  return kind === "application_lead"
    ? `/advisor/applications/${id}`
    : `/advisor/sessions-and-calls/session/${id}`;
}

function emptyMessage(
  search: string,
  type: AdvisorSessionsAndCallsTypeFilter,
): string {
  if (search.trim()) {
    return "No sessions or calls match your search.";
  }
  if (type === "application_lead") {
    return "No scheduled lead calls right now.";
  }
  if (type === "advisor_session") {
    return "No booked advisor sessions right now.";
  }
  return "No upcoming sessions or scheduled lead calls right now.";
}

export function AdvisorSessionsAndCallsTable({
  rows,
  totalRows,
  page,
  limit,
  search,
  type,
  typeCounts,
}: AdvisorSessionsAndCallsPanelProps) {
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
        next.set("sessionsPage", "1");
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

  const switchType = useCallback(
    (nextType: AdvisorSessionsAndCallsTypeFilter) => {
      if (nextType === type) return;
      startTransition(() => {
        const next = new URLSearchParams(searchParams.toString());
        if (nextType === "all") {
          next.delete("sessionsType");
        } else {
          next.set("sessionsType", nextType);
        }
        next.set("sessionsPage", "1");
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams, type],
  );

  function openRow(kind: "application_lead" | "advisor_session", id: string) {
    router.push(rowHref(kind, id));
  }

  return (
    <div
      className={`overflow-hidden rounded-[14px] border border-[var(--border-light)] bg-white ${isPending ? "opacity-75" : ""}`}
      aria-busy={isPending}
    >
      <div className="flex flex-wrap gap-1 border-b border-[var(--border-light)] px-4 pt-3">
        {TYPE_OPTIONS.map((option) => {
          const active = option.value === type;
          const count = typeCounts[option.value];
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => switchType(option.value)}
              className={
                active
                  ? "-mb-px border-b-2 border-[var(--green)] px-3 py-2 text-[13px] font-semibold text-[var(--green-dark)]"
                  : "px-3 py-2 text-[13px] font-medium text-[var(--text-mid)] hover:text-[var(--text)]"
              }
            >
              {option.label}
              <span className="ml-1.5 text-[11px] font-normal text-[var(--text-hint)]">
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-light)] px-4 py-3.5">
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
            placeholder="Search sessions and calls..."
            className="w-[260px] max-w-full rounded-[8px] border-[1.5px] border-[var(--border)] bg-[#faf9f4] py-[7px] pl-8 pr-3 text-[12.5px] text-[var(--text)] outline-none transition-colors focus:border-[var(--green-light)] focus:bg-white"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">School</th>
              <th className="px-4 py-3">Info</th>
              <th className="px-4 py-3">Meeting</th>
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
                  {emptyMessage(search, type)}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={`${row.kind}-${row.id}`}
                  className="cursor-pointer border-t border-[var(--border-light)] transition-colors hover:bg-[#faf9f4]"
                  onClick={() => openRow(row.kind, row.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openRow(row.kind, row.id);
                    }
                  }}
                  tabIndex={0}
                  role="link"
                  aria-label={`Open ${kindLabel(row.kind)} for ${row.studentName}`}
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[var(--green-dark)]">
                      {row.studentName}
                    </div>
                    <div className="text-[11px] text-[var(--text-hint)]">
                      {row.studentEmail}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold ${kindBadgeClass(row.kind)}`}
                    >
                      {kindLabel(row.kind)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-mid)]">
                    {row.schoolName}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-light)]">
                    {row.subtitle}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {row.isOverdue ? (
                        <span
                          className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#d97706]"
                          title="Overdue"
                          aria-hidden
                        />
                      ) : null}
                      <span className="text-[var(--text-light)]">
                        {formatMeetingDateTime(row.meetingAt)}
                      </span>
                      {row.isOverdue ? (
                        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#d97706]">
                          Overdue
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-mid)]">
                    {row.statusLabel}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-[var(--border-light)] px-4 py-3">
        <Pagination
          totalRows={totalRows}
          page={page}
          limit={limit}
          limitOptions={SESSIONS_LIMIT_OPTIONS}
          pageParam="sessionsPage"
          limitParam="sessionsLimit"
        />
      </div>
    </div>
  );
}
