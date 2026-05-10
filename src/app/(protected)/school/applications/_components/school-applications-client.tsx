"use client";

import type { SchoolApplicationTableRow } from "@/app/(protected)/school/applications/_lib/fetch-school-applications-page";
import {
  DB_APPLICATION_STATUS_DISPLAY,
  SCHOOL_APPLICATION_FILTER_LABEL,
  SCHOOL_APPLICATION_FILTER_STATUSES,
} from "@/app/(protected)/school/applications/_lib/application-support-status-labels";
import type { DestinationSelectItem } from "@/lib/school-portal-destination-options";
import { Pagination } from "@/components/pagination";
import Link from "next/link";

const filterSelectClass =
  "rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-2 text-[12.5px] font-medium text-[var(--text-mid)] outline-none appearance-none bg-[length:10px_6px] bg-[position:right_10px_center] bg-no-repeat pr-9 cursor-pointer transition-colors focus:border-[var(--green-light)]";

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22 viewBox=%220 0 10 6%22 fill=%22none%22%3E%3Cpath d=%22M1 1l4 4 4-4%22 stroke=%22%236a6a6a%22 stroke-width=%221.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/%3E%3C/svg%3E")';

function initials(first: string, last: string) {
  const a = first.trim()[0];
  const b = last.trim()[0];
  const pair = `${a ?? ""}${b ?? ""}`.toUpperCase();
  return pair || "?";
}

function formatSubmitted(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function statusPillClass(dbStatus: string): string {
  if (dbStatus === "submitted") {
    return "bg-[rgba(45,106,79,0.12)] text-[var(--green-dark)]";
  }
  if (dbStatus === "blocked") {
    return "bg-[rgba(231,76,60,0.12)] text-[#8c2d22]";
  }
  if (dbStatus === "in_progress") {
    return "bg-[rgba(212,162,42,0.14)] text-[#7a5d10]";
  }
  if (dbStatus === "new" || dbStatus === "assigned") {
    return "bg-[#ECEAE5] text-[var(--text-mid)]";
  }
  return "bg-[#ECEAE5] text-[var(--text-mid)]";
}

export function SchoolApplicationsClient({
  rows,
  totalRows,
  page,
  limit,
  q,
  status,
  country,
  destinationItems,
}: {
  rows: SchoolApplicationTableRow[];
  totalRows: number;
  page: number;
  limit: number;
  q: string;
  status: string;
  country: string;
  destinationItems: DestinationSelectItem[];
}) {
  const filterActive =
    q.trim().length > 0 || status !== "" || country.trim() !== "";

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white">
        <div className="border-b border-[var(--border-light)] px-5 py-4">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-[var(--text)]">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--green-bg)] text-[var(--green)] [&_svg]:h-[13px] [&_svg]:w-[13px]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6M16 13H8M16 17H8" />
              </svg>
            </span>
            All applications
            <span className="font-normal text-[var(--text-light)]">
              {" "}
              ({totalRows})
            </span>
          </h2>
          <p className="mt-1 text-[12px] text-[var(--text-light)]">
            Application support packages from students at your school — one row
            per university they listed on their application.
          </p>
        </div>

        <form
          className="flex flex-wrap items-center gap-2 border-b border-[var(--border-light)] bg-[#faf9f4] px-5 py-3.5"
          action="/school/applications"
          method="get"
        >
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="limit" value={String(limit)} />
          <div className="relative min-w-[180px] flex-1 basis-[200px]">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[var(--text-hint)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <label htmlFor="app-search" className="sr-only">
              Search student or university
            </label>
            <input
              id="app-search"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search student or university"
              className="w-full rounded-lg border-[1.5px] border-[var(--border)] bg-white py-2 pl-8 pr-3 font-[family-name:var(--font-dm-sans)] text-[12.5px] outline-none placeholder:text-[var(--text-hint)] focus:border-[var(--green-light)]"
            />
          </div>
          <select
            name="status"
            className={`${filterSelectClass} min-w-[180px]`}
            style={{ backgroundImage: SELECT_CHEVRON }}
            defaultValue={status}
            aria-label="Application status"
          >
            <option value="">All statuses</option>
            {SCHOOL_APPLICATION_FILTER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SCHOOL_APPLICATION_FILTER_LABEL[s]}
              </option>
            ))}
          </select>
          <select
            name="country"
            className={`${filterSelectClass} max-w-[min(100vw-2rem,280px)] min-w-[160px]`}
            style={{ backgroundImage: SELECT_CHEVRON }}
            defaultValue={country}
            aria-label="Destination / country (intake)"
          >
            <option value="">All destinations</option>
            {destinationItems.map((item, idx) =>
              item.kind === "divider" ? (
                <option key={`d-${idx}-${item.label}`} value="" disabled>
                  {item.label}
                </option>
              ) : (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ),
            )}
          </select>
          <button
            type="submit"
            className="rounded-lg border-[1.5px] border-[var(--border)] bg-white px-4 py-2 text-[12.5px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)]"
          >
            Apply
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="whitespace-nowrap bg-[#faf9f4] px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  Student
                </th>
                <th className="whitespace-nowrap bg-[#faf9f4] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  University
                </th>
                <th className="whitespace-nowrap bg-[#faf9f4] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  Destinations
                </th>
                <th className="whitespace-nowrap bg-[#faf9f4] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  Program
                </th>
                <th className="whitespace-nowrap bg-[#faf9f4] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  Submitted
                </th>
                <th className="whitespace-nowrap bg-[#faf9f4] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  Status
                </th>
                <th className="whitespace-nowrap bg-[#faf9f4] px-5 py-2.5 pr-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  Decision
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    className="px-5 py-10 text-center text-[13px] text-[var(--text-light)]"
                    colSpan={7}
                  >
                    {!filterActive && totalRows === 0
                      ? "No application support submissions yet for your school."
                      : "No applications match your filters."}
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const statusLabel =
                    DB_APPLICATION_STATUS_DISPLAY[r.status] ?? r.status;
                  const studentName =
                    `${r.firstName} ${r.lastName}`.trim() || r.email;
                  return (
                    <tr
                      key={r.rowKey}
                      className="border-b border-[var(--border-light)] transition-colors last:border-b-0 hover:bg-[#faf9f4]"
                    >
                      <td className="py-3 pl-5 pr-3 align-middle">
                        <Link
                          href={`/school/students/${r.studentId}`}
                          className="flex items-center gap-2.5 rounded-md outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[var(--green-light)]"
                        >
                          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] text-[11.5px] font-semibold text-[var(--green-dark)]">
                            {initials(r.firstName, r.lastName)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold leading-tight text-[var(--text)] hover:text-[var(--green)]">
                              {studentName}
                            </div>
                            <div className="truncate text-[11.5px] text-[var(--text-hint)]">
                              {r.email}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="max-w-[200px] px-4 py-3 align-middle font-semibold text-[var(--text)]">
                        {r.universityName}
                      </td>
                      <td className="max-w-[180px] px-4 py-3 align-middle text-[12.5px] text-[var(--text-light)]">
                        {r.country?.trim() || "—"}
                      </td>
                      <td className="max-w-[200px] px-4 py-3 align-middle text-[12.5px] leading-snug text-[var(--text-mid)]">
                        {r.program?.trim() || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-middle text-[12px] text-[var(--text-mid)]">
                        {formatSubmitted(r.submittedAt)}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${statusPillClass(r.status)}`}
                        >
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70"
                            aria-hidden
                          />
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-5 py-3 align-middle">
                        <span className="text-[var(--text-hint)]">—</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pb-8">
        <Pagination
          totalRows={totalRows}
          page={page}
          limit={limit}
          limitOptions={[10, 12, 20, 50]}
          pageParam="page"
          limitParam="limit"
        />
      </div>
    </div>
  );
}
