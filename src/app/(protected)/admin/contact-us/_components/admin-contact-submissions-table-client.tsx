"use client";

import {
  deleteContactSubmission,
  updateContactSubmissionStatus,
} from "@/actions/admin-contact-submissions";
import { Pagination } from "@/components/pagination";
import { format } from "date-fns";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { AdminContactSubmissionTableRow } from "../_lib/fetch-admin-contact-submissions-page";
import {
  ADMIN_CONTACT_SUBMISSION_STATUS_FILTER_OPTIONS,
  type AdminContactSubmissionsStatusFilter,
} from "../_lib/parse-admin-contact-submissions-search-params";

const LIMIT_OPTIONS = [10, 20, 30, 50] as const;

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

const filterSelectClass =
  "min-w-[140px] cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_8px_center] bg-no-repeat py-[7px] pl-[10px] pr-9 text-[12px] text-[#4a4a4a] outline-none transition-colors focus:border-[#40916C]";

const statusBadgeClass = {
  new: "bg-[#e8f5ee] text-[#2D6A4F]",
  read: "bg-[#f3f2f0] text-[#4a4a4a]",
  archived: "bg-[#ece9e4] text-[#a0a0a0]",
} as const;

function statusLabel(status: AdminContactSubmissionTableRow["status"]): string {
  if (status === "new") return "New";
  if (status === "read") return "Read";
  return "Archived";
}

function formatSubmittedAt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "MMM d, yyyy · h:mm a");
}

function truncateMessage(message: string, max = 80): string {
  const trimmed = message.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

type AdminContactSubmissionsTableClientProps = {
  rows: AdminContactSubmissionTableRow[];
  totalRows: number;
  page: number;
  limit: number;
  q: string;
  status: AdminContactSubmissionsStatusFilter;
};

function ViewSubmissionDialog({
  row,
  onClose,
}: {
  row: AdminContactSubmissionTableRow;
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
        aria-labelledby="view-submission-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[12px] border border-[#ece9e4] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ece9e4] px-5 py-4">
          <h2 id="view-submission-title" className="text-[16px] font-bold text-[#1a1a1a]">
            Contact submission
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
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
              Submitted
            </p>
            <p className="mt-1 text-[#1a1a1a]">{formatSubmittedAt(row.createdAt)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
              From
            </p>
            <p className="mt-1 font-medium text-[#1a1a1a]">{row.name}</p>
            <a
              href={`mailto:${row.email}`}
              className="mt-0.5 inline-block text-[#2D6A4F] hover:underline"
            >
              {row.email}
            </a>
          </div>
          {row.subject ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
                Subject
              </p>
              <p className="mt-1 text-[#1a1a1a]">{row.subject}</p>
            </div>
          ) : null}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
              Message
            </p>
            <p className="mt-1 whitespace-pre-wrap text-[#1a1a1a]">{row.message}</p>
          </div>
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

export function AdminContactSubmissionsTableClient({
  rows,
  totalRows,
  page,
  limit,
  q,
  status,
}: AdminContactSubmissionsTableClientProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [viewRow, setViewRow] = useState<AdminContactSubmissionTableRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const filtersActive = q.trim().length > 0 || status !== "";

  function runAction(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        window.alert(result.error ?? "Action failed.");
        return;
      }
      router.refresh();
    });
  }

  function handleMarkRead(row: AdminContactSubmissionTableRow) {
    runAction(() => updateContactSubmissionStatus(row.id, "read"));
  }

  function handleArchive(row: AdminContactSubmissionTableRow) {
    runAction(() => updateContactSubmissionStatus(row.id, "archived"));
  }

  function handleDelete(row: AdminContactSubmissionTableRow) {
    const label = row.subject?.trim() || row.name || "this submission";
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) {
      return;
    }
    runAction(() => deleteContactSubmission(row.id));
  }

  return (
    <>
      <div className="overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece9e4] px-5 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="text-[14px] font-bold text-[#1a1a1a]">Contact Us</h2>
            <span className="text-[11px] text-[#a0a0a0]">
              {totalRows.toLocaleString()} {totalRows === 1 ? "submission" : "submissions"}
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
              <label htmlFor="admin-contact-submissions-search" className="sr-only">
                Search submissions
              </label>
              <input
                id="admin-contact-submissions-search"
                key={`${q}-${status}`}
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search submissions..."
                className="w-full rounded-[8px] border border-[#e0deda] bg-white py-[7px] pl-8 pr-3 text-[12px] text-[#1a1a1a] outline-none transition-colors placeholder:text-[#a0a0a0] focus:border-[#40916C]"
              />
            </div>

            <select
              name="status"
              aria-label="Filter by status"
              className={filterSelectClass}
              style={{ backgroundImage: SELECT_CHEVRON }}
              defaultValue={status}
            >
              {ADMIN_CONTACT_SUBMISSION_STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-[7px] text-[12px] font-semibold text-[#4a4a4a] transition-all duration-150 hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
            >
              Apply
            </button>
          </form>
        </div>

        <div className="overflow-x-auto px-5 pb-1 pt-1 [zoom:0.95]">
          <table className="w-full min-w-[960px] border-collapse">
            <thead>
              <tr className="bg-[#fafaf8]">
                {[
                  "Submitted",
                  "Name",
                  "Email",
                  "Subject",
                  "Message",
                  "Status",
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
                      ? "No contact submissions match your filters."
                      : "No contact submissions yet."}
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const isLastRow = index === rows.length - 1;
                  const cellBorder = isLastRow ? "" : "border-b border-[#ece9e4]";

                  return (
                    <tr key={row.id} className="text-[13px] text-[#4a4a4a]">
                      <td
                        className={`${cellBorder} whitespace-nowrap px-4 py-3 text-[12px]`}
                      >
                        {formatSubmittedAt(row.createdAt)}
                      </td>
                      <td className={`${cellBorder} px-4 py-3 font-medium text-[#1a1a1a]`}>
                        {row.name || "—"}
                      </td>
                      <td className={`${cellBorder} px-4 py-3`}>
                        {row.email ? (
                          <a
                            href={`mailto:${row.email}`}
                            className="text-[#2D6A4F] hover:underline"
                          >
                            {row.email}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className={`${cellBorder} max-w-[160px] px-4 py-3`}>
                        <span className="line-clamp-1">{row.subject || "—"}</span>
                      </td>
                      <td className={`${cellBorder} max-w-[220px] px-4 py-3`}>
                        <span className="line-clamp-2">{truncateMessage(row.message)}</span>
                      </td>
                      <td className={`${cellBorder} whitespace-nowrap px-4 py-3`}>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusBadgeClass[row.status]}`}
                        >
                          {statusLabel(row.status)}
                        </span>
                      </td>
                      <td className={`${cellBorder} px-4 py-3`}>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => setViewRow(row)}
                            className="cursor-pointer rounded-[6px] border border-[#e0deda] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#4a4a4a] transition-colors hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:opacity-60"
                          >
                            View
                          </button>
                          {row.status === "new" ? (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleMarkRead(row)}
                              className="cursor-pointer rounded-[6px] border border-[#e0deda] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#4a4a4a] transition-colors hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:opacity-60"
                            >
                              Mark read
                            </button>
                          ) : null}
                          {row.status === "new" || row.status === "read" ? (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleArchive(row)}
                              className="cursor-pointer rounded-[6px] border border-[#e0deda] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#4a4a4a] transition-colors hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:opacity-60"
                            >
                              Archive
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleDelete(row)}
                            className="cursor-pointer rounded-[6px] border border-[#fecaca] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#b91c1c] transition-colors hover:bg-[#fef2f2] disabled:opacity-60"
                          >
                            Delete
                          </button>
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
        <ViewSubmissionDialog row={viewRow} onClose={() => setViewRow(null)} />
      ) : null}
    </>
  );
}
