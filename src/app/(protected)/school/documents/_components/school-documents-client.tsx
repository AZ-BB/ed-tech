"use client";

import type { SchoolDocumentTableRow } from "@/app/(protected)/school/documents/_lib/fetch-school-documents";
import {
  getSchoolMyApplicationDocumentViewUrl,
  sendSchoolDocumentReminder,
} from "@/actions/school-documents";
import { Pagination } from "@/components/pagination";
import { useEffect, useState } from "react";

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

function normalizeStatusSelect(raw: string): string {
  if (raw === "missing" || raw === "uploaded") return raw;
  return "";
}

export function SchoolDocumentsClient({
  rows,
  totalRows,
  page,
  limit,
  q,
  status,
}: {
  rows: SchoolDocumentTableRow[];
  totalRows: number;
  page: number;
  limit: number;
  q: string;
  status: string;
}) {
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [remindRow, setRemindRow] = useState<SchoolDocumentTableRow | null>(
    null,
  );
  const [remindSending, setRemindSending] = useState(false);
  const [remindError, setRemindError] = useState<string | null>(null);
  const statusValue = normalizeStatusSelect(status);
  const filterActive = q.trim().length > 0 || statusValue !== "";

  useEffect(() => {
    if (!remindRow) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !remindSending) setRemindRow(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [remindRow, remindSending]);

  async function handleView(documentId: string) {
    setOpeningId(documentId);
    try {
      const res = await getSchoolMyApplicationDocumentViewUrl(documentId);
      if ("error" in res) {
        window.alert(res.error);
        return;
      }
      window.open(res.url, "_blank", "noopener,noreferrer");
    } finally {
      setOpeningId(null);
    }
  }

  function openRemindModal(row: SchoolDocumentTableRow) {
    setRemindError(null);
    setRemindRow(row);
  }

  async function confirmSendReminder() {
    if (!remindRow) return;
    setRemindSending(true);
    setRemindError(null);
    try {
      const res = await sendSchoolDocumentReminder(remindRow.documentId);
      if ("error" in res) {
        setRemindError(res.error);
        return;
      }
      setRemindRow(null);
      window.alert(
        "Reminder queued. Email delivery via Resend will be enabled in a future update.",
      );
    } finally {
      setRemindSending(false);
    }
  }

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
                <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
                <path d="M13 2v7h7" />
              </svg>
            </span>
            All documents
            <span className="font-normal text-[var(--text-light)]">
              {" "}
              ({totalRows})
            </span>
          </h2>
          <p className="mt-1 text-[12px] text-[var(--text-light)]">
            Track every uploaded, missing, and pending document across students
            at your school (from each student&apos;s My Applications checklist).
          </p>
        </div>

        <form
          className="flex flex-wrap items-center gap-2 border-b border-[var(--border-light)] bg-[#faf9f4] px-5 py-3.5"
          action="/school/documents"
          method="get"
        >
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="limit" value={String(limit)} />
          <div className="relative min-w-[200px] flex-1 basis-[220px]">
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
            <label htmlFor="school-doc-search" className="sr-only">
              Search student or document
            </label>
            <input
              id="school-doc-search"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search student or document"
              className="w-full rounded-lg border-[1.5px] border-[var(--border)] bg-white py-2 pl-8 pr-3 font-[family-name:var(--font-dm-sans)] text-[12.5px] outline-none placeholder:text-[var(--text-hint)] focus:border-[var(--green-light)]"
            />
          </div>
          <select
            name="status"
            className={filterSelectClass}
            style={{ backgroundImage: SELECT_CHEVRON }}
            defaultValue={statusValue}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="missing">Missing</option>
            <option value="uploaded">Uploaded</option>
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
                  Document
                </th>
                <th className="whitespace-nowrap bg-[#faf9f4] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  Status
                </th>
                <th className="whitespace-nowrap bg-[#faf9f4] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  Updated
                </th>
                <th className="whitespace-nowrap bg-[#faf9f4] px-5 py-2.5 pr-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    className="px-5 py-10 text-center text-[13px] text-[var(--text-light)]"
                    colSpan={5}
                  >
                    {!filterActive && totalRows === 0
                      ? "No checklist documents yet. Students will appear here after they open My Applications (which creates their document slots)."
                      : "No documents match your filters."}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.documentId}
                    className="border-b border-[var(--border-light)] transition-colors last:border-b-0 hover:bg-[#faf9f4]"
                  >
                    <td className="py-3 pl-5 pr-3 align-middle">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] text-[11.5px] font-semibold text-[var(--green-dark)]">
                          {initials(r.firstName, r.lastName)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold leading-tight text-[var(--text)]">
                            {r.firstName} {r.lastName}
                          </div>
                          <div className="truncate text-[11.5px] text-[var(--text-hint)]">
                            {r.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[240px] px-4 py-3 align-middle">
                      <div className="font-semibold text-[var(--text)]">
                        {r.documentName}
                      </div>
                      {r.description ? (
                        <div className="mt-0.5 text-[11px] leading-snug text-[var(--text-light)]">
                          {r.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {r.isUploaded ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(52,152,219,0.12)] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#1d4d70]">
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3498DB]"
                            aria-hidden
                          />
                          Uploaded
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(231,76,60,0.12)] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#8c2d22]">
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#E74C3C]"
                            aria-hidden
                          />
                          Missing
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-middle text-[12px] text-[var(--text-mid)]">
                      {r.updatedLabel}
                    </td>
                    <td className="px-5 py-3 align-middle">
                      {r.isUploaded ? (
                        <button
                          type="button"
                          className="inline-flex cursor-pointer items-center rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-[12px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)] disabled:cursor-wait disabled:opacity-60"
                          disabled={openingId === r.documentId}
                          onClick={() => handleView(r.documentId)}
                        >
                          {openingId === r.documentId ? "Opening…" : "View"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex cursor-pointer items-center rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-[12px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)]"
                          onClick={() => openRemindModal(r)}
                        >
                          Send reminder
                        </button>
                      )}
                    </td>
                  </tr>
                ))
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

      {remindRow ? (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <div
          role="presentation"
          className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(15,30,20,0.5)] px-4 py-6"
          onClick={() => {
            if (!remindSending) setRemindRow(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !remindSending) setRemindRow(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remind-dialog-title"
            tabIndex={-1}
            className="w-full max-w-[440px] rounded-[var(--radius-lg)] bg-white shadow-[0_12px_32px_rgba(15,30,20,.12)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[var(--border-light)] px-5 py-4">
              <h3
                id="remind-dialog-title"
                className="font-[family-name:var(--font-dm-serif)] text-xl tracking-tight text-[var(--text)]"
              >
                Send document reminder
              </h3>
              <p className="mt-1 text-[12px] text-[var(--text-light)]">
                We&apos;ll email the student to upload this item from their My
                Applications checklist. Delivery will use{" "}
                <span className="font-medium text-[var(--text-mid)]">Resend</span>{" "}
                once it is configured.
              </p>
            </div>
            <div className="space-y-3 px-5 py-4 text-[13px] text-[var(--text-mid)]">
              <div className="rounded-lg border border-[var(--border-light)] bg-[#faf9f4] px-3 py-2.5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  Student
                </div>
                <div className="mt-0.5 font-semibold text-[var(--text)]">
                  {remindRow.firstName} {remindRow.lastName}
                </div>
                <div className="text-[12px] text-[var(--text-light)]">
                  {remindRow.email}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  Document
                </div>
                <div className="mt-0.5 font-semibold text-[var(--text)]">
                  {remindRow.documentName}
                </div>
              </div>
              <p className="text-[12px] text-[var(--text-light)]">
                Are you sure you want to send this reminder?
              </p>
              {remindError ? (
                <p className="text-[12px] font-medium text-[#8c2d22]">
                  {remindError}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border-light)] px-5 py-4">
              <button
                type="button"
                className="cursor-pointer rounded-lg border-[1.5px] border-[var(--border)] bg-white px-4 py-2 text-[12.5px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={remindSending}
                onClick={() => setRemindRow(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-lg border-[1.5px] border-[var(--green)] bg-[var(--green)] px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-[var(--green-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={remindSending}
                onClick={() => confirmSendReminder()}
              >
                {remindSending ? "Sending…" : "Send reminder"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
