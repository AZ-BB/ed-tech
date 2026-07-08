"use client";

import { Pagination } from "@/components/pagination";
import { format } from "date-fns";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type { AdminInternshipSupportRequestTableRow } from "../../../_lib/fetch-admin-internship-support-requests-page";

const LIMIT_OPTIONS = [10, 20, 30, 50] as const;

function formatSubmittedAt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "MMM d, yyyy · h:mm a");
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
        {label}
      </p>
      <div className="mt-1 text-[#1a1a1a]">{children}</div>
    </div>
  );
}

function ViewSupportRequestDialog({
  row,
  onClose,
}: {
  row: AdminInternshipSupportRequestTableRow;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-labelledby="view-support-request-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[12px] border border-[#ece9e4] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ece9e4] px-5 py-4">
          <h2
            id="view-support-request-title"
            className="text-[16px] font-bold text-[#1a1a1a]"
          >
            Internship support request
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-[6px] px-2 py-1 text-[#a0a0a0] hover:bg-[#f3f2f0] hover:text-[#1a1a1a]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-5 py-4 text-[13px] text-[#4a4a4a]">
          <Field label="Submitted">{formatSubmittedAt(row.createdAt)}</Field>

          <Field label="Student">
            <p className="font-medium">{row.fullName || "—"}</p>
            {row.email ? (
              <a
                href={`mailto:${row.email}`}
                className="mt-0.5 inline-block text-[#2D6A4F] hover:underline"
              >
                {row.email}
              </a>
            ) : null}
            {row.studentId ? (
              <div className="mt-2">
                <Link
                  href={`/admin/users/students/${row.studentId}`}
                  className="inline-flex text-[12px] font-semibold text-[#2D6A4F] hover:underline"
                >
                  Open student page →
                </Link>
              </div>
            ) : (
              <p className="mt-2 text-[12px] text-[#a0a0a0]">No linked student account</p>
            )}
          </Field>

          <Field label="School">{row.schoolName || "—"}</Field>
          <Field label="Grade">{row.grade || "—"}</Field>
          <Field label="Preferred location">{row.preferredLocation || "—"}</Field>
          <Field label="Preferred format">{row.preferredFormat || "—"}</Field>
          <Field label="Pay preference">{row.payPreference || "—"}</Field>

          <Field label="Interests">
            {row.interests.length > 0 ? (
              <ul className="list-inside list-disc space-y-0.5">
                {row.interests.map((interest) => (
                  <li key={interest}>{interest}</li>
                ))}
              </ul>
            ) : (
              "—"
            )}
          </Field>

          <Field label="Message">
            <p className="whitespace-pre-wrap">{row.message || "—"}</p>
          </Field>
        </div>

        <div className="flex justify-end border-t border-[#ece9e4] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a] transition-colors hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export type AdminInternshipSupportRequestsTableClientProps = {
  rows: AdminInternshipSupportRequestTableRow[];
  totalRows: number;
  page: number;
  limit: number;
  q: string;
};

export function AdminInternshipSupportRequestsTableClient({
  rows,
  totalRows,
  page,
  limit,
  q,
}: AdminInternshipSupportRequestsTableClientProps) {
  const pathname = usePathname() ?? "";
  const [viewRow, setViewRow] =
    useState<AdminInternshipSupportRequestTableRow | null>(null);
  const filtersActive = q.trim().length > 0;

  return (
    <>
      <div className="overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece9e4] px-5 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="text-[14px] font-bold text-[#1a1a1a]">
              Support Requests
            </h2>
            <span className="text-[11px] text-[#a0a0a0]">
              {totalRows.toLocaleString()}{" "}
              {totalRows === 1 ? "request" : "requests"}
            </span>
          </div>

          <form
            className="flex min-w-[220px] flex-1 flex-wrap items-center justify-end gap-2"
            action={pathname}
            method="get"
          >
            <input type="hidden" name="page" value="1" />
            <input type="hidden" name="limit" value={String(limit)} />

            <div className="relative w-full max-w-[220px]">
              <svg
                className="pointer-events-none absolute left-[10px] top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[#a0a0a0]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <label htmlFor="admin-internship-support-search" className="sr-only">
                Search requests
              </label>
              <input
                id="admin-internship-support-search"
                key={q}
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search requests..."
                className="w-full rounded-[8px] border border-[#e0deda] bg-white py-[7px] pl-8 pr-3 text-[12px] text-[#1a1a1a] outline-none transition-colors placeholder:text-[#a0a0a0] focus:border-[#40916C]"
              />
            </div>

            <button
              type="submit"
              className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-[7px] text-[12px] font-semibold text-[#4a4a4a] transition-all duration-150 hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
            >
              Apply
            </button>
          </form>
        </div>

        <div className="overflow-x-auto px-5 pb-1 pt-1 [zoom:0.95]">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="bg-[#fafaf8]">
                {[
                  "Submitted",
                  "Student",
                  "School",
                  "Location",
                  "Format",
                  "Pay",
                  "Actions",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="border-b border-[#ece9e4] px-4 py-[10px] text-left text-[10px] font-bold uppercase tracking-[0.8px] text-[#a0a0a0]"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-[13px] text-[#a0a0a0]"
                  >
                    {filtersActive
                      ? "No support requests match your search."
                      : "No internship support requests yet."}
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const isLastRow = index === rows.length - 1;
                  const cellBorder = isLastRow ? "" : "border-b border-[#ece9e4]";

                  return (
                    <tr
                      key={row.id}
                      className="cursor-pointer text-[13px] text-[#4a4a4a] transition-colors hover:bg-[#f0f7f2]"
                      onClick={() => setViewRow(row)}
                    >
                      <td
                        className={`${cellBorder} whitespace-nowrap px-4 py-3 text-[12px]`}
                      >
                        {formatSubmittedAt(row.createdAt)}
                      </td>
                      <td className={`${cellBorder} px-4 py-3`}>
                        <p className="font-medium text-[#1a1a1a]">
                          {row.fullName || "—"}
                        </p>
                        <p className="text-[12px] text-[#a0a0a0]">{row.email || "—"}</p>
                      </td>
                      <td className={`${cellBorder} px-4 py-3`}>
                        <p>{row.schoolName || "—"}</p>
                        <p className="text-[12px] text-[#a0a0a0]">{row.grade || "—"}</p>
                      </td>
                      <td className={`${cellBorder} px-4 py-3`}>
                        {row.preferredLocation || "—"}
                      </td>
                      <td className={`${cellBorder} px-4 py-3`}>
                        {row.preferredFormat || "—"}
                      </td>
                      <td className={`${cellBorder} px-4 py-3`}>
                        {row.payPreference || "—"}
                      </td>
                      <td
                        className={`${cellBorder} px-4 py-3`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewRow(row)}
                            className="cursor-pointer rounded-[6px] border border-[#e0deda] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#4a4a4a] transition-colors hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
                          >
                            View
                          </button>
                          {row.studentId ? (
                            <Link
                              href={`/admin/users/students/${row.studentId}`}
                              className="cursor-pointer rounded-[6px] border border-[#e0deda] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#4a4a4a] transition-colors hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
                            >
                              Student
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-[#ece9e4] px-5 py-3">
          <Pagination
            totalRows={totalRows}
            page={page}
            limit={limit}
            limitOptions={LIMIT_OPTIONS}
          />
        </div>
      </div>

      {viewRow ? (
        <ViewSupportRequestDialog row={viewRow} onClose={() => setViewRow(null)} />
      ) : null}
    </>
  );
}
