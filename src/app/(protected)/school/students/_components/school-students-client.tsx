"use client";

import {
  deleteSchoolStudentInvite,
  getPendingSchoolInvites,
  inviteSchoolStudentEmail,
  type PendingInviteRow,
} from "@/actions/school-students";
import type { SchoolStudentTableRow } from "@/app/(protected)/school/students/_lib/fetch-school-students-page";
import { Pagination } from "@/components/pagination";
import type { DestinationSelectItem } from "@/lib/school-portal-destination-options";
import { GRADE_FILTER_OPTIONS } from "@/lib/school-portal-destination-options";
import type { GeneralResponse } from "@/utils/response";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22 viewBox=%220 0 10 6%22 fill=%22none%22%3E%3Cpath d=%22M1 1l4 4 4-4%22 stroke=%22%236a6a6a%22 stroke-width=%221.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/%3E%3C/svg%3E")';

const filterSelectClass =
  "rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-2 text-[12.5px] font-medium text-[var(--text-mid)] outline-none appearance-none bg-[length:10px_6px] bg-[position:right_10px_center] bg-no-repeat pr-9 cursor-pointer transition-colors focus:border-[var(--green-light)] disabled:opacity-55";

export function SchoolStudentsClient({
  rows,
  totalRows,
  page,
  limit,
  q,
  grade,
  dest,
  destinationItems,
  counselorOptions,
}: {
  rows: SchoolStudentTableRow[];
  totalRows: number;
  page: number;
  limit: number;
  q: string;
  grade: string;
  dest: string;
  destinationItems: DestinationSelectItem[];
  counselorOptions: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [pendingSearchDraft, setPendingSearchDraft] = useState("");
  const [pendingQ, setPendingQ] = useState("");
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingLimit, setPendingLimit] = useState(10);
  const [pendingRows, setPendingRows] = useState<PendingInviteRow[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingListVersion, setPendingListVersion] = useState(0);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const prevPendingQRef = useRef(pendingQ);
  const invitePrevPending = useRef(false);

  const [inviteState, inviteAction, invitePending] = useActionState(
    inviteSchoolStudentEmail,
    null as GeneralResponse<null> | null,
  );

  useEffect(() => {
    const finished = invitePrevPending.current && !invitePending;
    if (finished && inviteState?.error === null) {
      setInviteOpen(false);
      router.refresh();
      if (pendingOpen) {
        setPendingListVersion((v) => v + 1);
      }
    }
    invitePrevPending.current = invitePending;
  }, [invitePending, inviteState, router, pendingOpen]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setPendingQ(pendingSearchDraft.trim());
    }, 320);
    return () => window.clearTimeout(id);
  }, [pendingSearchDraft]);

  useEffect(() => {
    if (prevPendingQRef.current !== pendingQ) {
      prevPendingQRef.current = pendingQ;
      setPendingPage(1);
    }
  }, [pendingQ]);

  useEffect(() => {
    if (pendingTotal <= 0 || pendingLimit <= 0) return;
    const totalPages = Math.max(1, Math.ceil(pendingTotal / pendingLimit));
    if (pendingPage > totalPages) {
      setPendingPage(totalPages);
    }
  }, [pendingTotal, pendingLimit, pendingPage]);

  useEffect(() => {
    if (!pendingOpen) return;
    let cancelled = false;
    (async () => {
      setPendingLoading(true);
      try {
        const { rows, totalRows } = await getPendingSchoolInvites({
          q: pendingQ,
          page: pendingPage,
          limit: pendingLimit,
        });
        if (!cancelled) {
          setPendingRows(rows);
          setPendingTotal(totalRows);
        }
      } finally {
        if (!cancelled) setPendingLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pendingOpen, pendingQ, pendingPage, pendingLimit, pendingListVersion]);

  const openPendingModal = () => {
    setPendingOpen(true);
    setPendingSearchDraft("");
    setPendingQ("");
    prevPendingQRef.current = "";
    setPendingPage(1);
    setPendingLimit(10);
  };

  async function handleRemoveInvite(row: PendingInviteRow) {
    const ok = window.confirm(
      `Remove the pending invite for ${row.email}? They will need a new invite to join.`,
    );
    if (!ok) return;

    setPendingDeleteId(row.id);
    try {
      const result = await deleteSchoolStudentInvite(row.id);
      if (result.error) {
        window.alert(result.error);
        return;
      }
      setPendingListVersion((v) => v + 1);
      router.refresh();
    } finally {
      setPendingDeleteId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-light)] px-5 py-4 sm:flex-nowrap">
          <div>
            <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-[var(--text)]">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--green-bg)] text-[var(--green)] [&_svg]:h-[13px] [&_svg]:w-[13px]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
              </span>
              All students
              <span className="font-normal text-[var(--text-light)]">
                {" "}
                ({totalRows})
              </span>
            </h2>
            <p className="mt-1 text-[12px] text-[var(--text-light)]">
              Students enrolled at your school (completed signup).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border-[1.5px] border-[var(--border)] bg-white px-4 py-2 text-[12.5px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)]"
              onClick={openPendingModal}
            >
              Pending invites
            </button>
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border-[1.5px] border-[var(--green)] bg-[var(--green)] px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-[var(--green-dark)]"
              onClick={() => setInviteOpen(true)}
            >
              + Add student
            </button>
          </div>
        </div>

        <form
          className="flex flex-wrap items-center gap-2 border-b border-[var(--border-light)] bg-[#faf9f4] px-5 py-3.5"
          action="/school/students"
          method="get"
        >
          <input type="hidden" name="page" value="1" />
          <div className="relative min-w-[200px] max-w-[340px] flex-1">
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
            <input type="hidden" name="limit" value={String(limit)} />
            <input
              type="search"
              name="q"
              placeholder="Search by name or email"
              defaultValue={q}
              className="w-full rounded-lg border-[1.5px] border-[var(--border)] bg-white py-2 pl-8 pr-3 font-[family-name:var(--font-dm-sans)] text-[12.5px] outline-none placeholder:text-[var(--text-hint)] focus:border-[var(--green-light)]"
            />
          </div>
          <select
            name="grade"
            aria-label="Filter by grade"
            style={{ backgroundImage: SELECT_CHEVRON }}
            className={`${filterSelectClass} min-w-[130px]`}
            defaultValue={grade}
          >
            <option value="">All grades</option>
            {GRADE_FILTER_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            name="dest"
            aria-label="Filter by destination"
            style={{ backgroundImage: SELECT_CHEVRON }}
            className={`${filterSelectClass} max-w-[min(100vw-2rem,360px)] min-w-[200px]`}
            defaultValue={dest}
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
                <th className="whitespace-nowrap bg-[#faf9f4] px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)] first:pl-5 last:pr-5">
                  Student
                </th>
                <th className="whitespace-nowrap bg-[#faf9f4] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  Grade
                </th>
                <th className="whitespace-nowrap bg-[#faf9f4] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  Destination
                </th>
                <th className="whitespace-nowrap bg-[#faf9f4] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  Programs
                </th>
                <th className="whitespace-nowrap bg-[#faf9f4] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  Profile
                </th>
                <th className="whitespace-nowrap bg-[#faf9f4] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  Unis
                </th>
                <th className="whitespace-nowrap bg-[#faf9f4] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  Last active
                </th>
                <th className="whitespace-nowrap bg-[#faf9f4] px-5 py-2.5 pr-5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  Counselor
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    className="px-5 py-10 text-center text-[13px] text-[var(--text-light)]"
                    colSpan={8}
                  >
                    No students match your filters yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[var(--border-light)] transition-colors last:border-b-0 hover:bg-[#faf9f4]"
                  >
                    <td className="py-3 pl-5 pr-3 align-middle">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] text-[11.5px] font-semibold text-[var(--green-dark)]">
                          {(r.firstName[0] ?? "?").toUpperCase()}
                          {(r.lastName[0] ?? "").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold leading-tight text-[var(--text)]">
                            {r.firstName} {r.lastName}
                          </div>
                          <div className="text-[11.5px] text-[var(--text-hint)]">
                            {r.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle text-[12.5px] text-[var(--text-light)]">
                      {r.grade ?? "—"}
                    </td>
                    <td className="max-w-[200px] px-4 py-3 align-middle text-[12.5px] leading-snug text-[var(--text-mid)]">
                      {r.destinationsSummary}
                    </td>
                    <td className="max-w-[200px] px-4 py-3 align-middle text-[12.5px] leading-snug text-[var(--text-mid)]">
                      {r.programsSummary}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 min-w-[72px] flex-1 rounded-sm bg-[var(--border-light)]">
                          <div
                            className="h-full rounded-sm"
                            style={{
                              width: `${Math.min(100, Math.max(0, r.profilePercent))}%`,
                              backgroundColor:
                                r.profilePercent >= 67
                                  ? "var(--green-bright)"
                                  : r.profilePercent >= 34
                                    ? "var(--green)"
                                    : "#d4a22a",
                            }}
                          />
                        </div>
                        <span className="min-w-[32px] text-right text-[12px] font-semibold text-[var(--text-mid)]">
                          {r.profilePercent}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle text-[12.5px] font-semibold text-[var(--text)]">
                      {r.unisCount}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-middle text-[12px] text-[var(--text-mid)]">
                      {r.lastActiveLabel}
                    </td>
                    <td className="px-5 py-3 align-middle text-[12.5px] text-[var(--text)]">
                      {r.counselorLabel}
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
          limitOptions={[10, 20, 50]}
          pageParam="page"
          limitParam="limit"
        />
      </div>

      {pendingOpen ? (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <div
          role="presentation"
          className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(15,30,20,0.5)] px-4 py-6"
          onClick={() => setPendingOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setPendingOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pending student invites"
            tabIndex={-1}
            className="flex max-h-[min(90vh,720px)] w-full max-w-[720px] flex-col overflow-hidden rounded-[var(--radius-lg)] bg-white shadow-[0_12px_32px_rgba(15,30,20,.12)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-light)] px-5 py-4">
              <div>
                <h3 className="font-[family-name:var(--font-dm-serif)] text-xl tracking-tight text-[var(--text)]">
                  Pending invites
                </h3>
                <p className="mt-1 text-[12px] text-[var(--text-light)]">
                  Students added by email who have not signed up yet.
                </p>
              </div>
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--text-light)] hover:bg-[#faf9f4] hover:text-[var(--text)]"
                onClick={() => setPendingOpen(false)}
                aria-label="Close"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="shrink-0 border-b border-[var(--border-light)] bg-[#faf9f4] px-5 py-3">
              <label htmlFor="pending-invite-search" className="sr-only">
                Search by email
              </label>
              <div className="relative">
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
                <input
                  id="pending-invite-search"
                  type="search"
                  value={pendingSearchDraft}
                  onChange={(e) => setPendingSearchDraft(e.target.value)}
                  placeholder="Search by email"
                  disabled={pendingLoading}
                  className="w-full rounded-lg border-[1.5px] border-[var(--border)] bg-white py-2 pl-8 pr-3 font-[family-name:var(--font-dm-sans)] text-[12.5px] outline-none placeholder:text-[var(--text-hint)] focus:border-[var(--green-light)] disabled:opacity-60"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
              {pendingLoading && pendingRows.length === 0 ? (
                <p className="py-10 text-center text-[13px] text-[var(--text-light)]">
                  Loading…
                </p>
              ) : pendingRows.length === 0 ? (
                <p className="py-10 text-center text-[13px] text-[var(--text-light)]">
                  {pendingQ
                    ? "No pending invites match this search."
                    : "No pending invites right now."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr>
                        <th className="whitespace-nowrap bg-[#faf9f4] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)] first:pl-3">
                          Email
                        </th>
                        <th className="whitespace-nowrap bg-[#faf9f4] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                          Grade
                        </th>
                        <th className="whitespace-nowrap bg-[#faf9f4] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                          Counselor
                        </th>
                        <th className="whitespace-nowrap bg-[#faf9f4] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                          Invited
                        </th>
                        <th className="whitespace-nowrap bg-[#faf9f4] px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)] last:pr-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRows.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-[var(--border-light)] last:border-b-0"
                        >
                          <td className="max-w-[220px] truncate px-3 py-2.5 font-medium text-[var(--text)]">
                            {r.email}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-mid)]">
                            {r.grade ?? "—"}
                          </td>
                          <td className="max-w-[160px] truncate px-3 py-2.5 text-[var(--text-mid)]">
                            {r.counselorLabel}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-[var(--text-mid)]">
                            {r.invitedLabel}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right">
                            <button
                              type="button"
                              className="cursor-pointer rounded-md border border-[var(--border)] bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[#c0392b] transition-colors hover:bg-[#fdf2f2] disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={
                                pendingLoading ||
                                pendingDeleteId === r.id
                              }
                              onClick={() => handleRemoveInvite(r)}
                            >
                              {pendingDeleteId === r.id ? "Removing…" : "Remove"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-[var(--border-light)] bg-[#faf9f4] px-5 py-3">
              <Pagination
                totalRows={pendingTotal}
                page={pendingPage}
                limit={pendingLimit}
                limitOptions={[5, 10, 20]}
                syncSearchParams={false}
                pageParam="pendingPage"
                limitParam="pendingLimit"
                onChange={({ page: p, limit: l }) => {
                  setPendingPage(p);
                  setPendingLimit(l);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
      {inviteOpen ? (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <div
          role="presentation"
          className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(15,30,20,0.5)] px-4 py-6"
          onClick={() => setInviteOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setInviteOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Invite student"
            tabIndex={-1}
            className="w-full max-w-[440px] overflow-hidden rounded-[var(--radius-lg)] bg-white shadow-[0_12px_32px_rgba(15,30,20,.12)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-light)] px-5 py-4">
              <h3 className="font-[family-name:var(--font-dm-serif)] text-xl tracking-tight text-[var(--text)]">
                Add student
              </h3>
              <button
                type="button"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--text-light)] hover:bg-[#faf9f4] hover:text-[var(--text)]"
                onClick={() => setInviteOpen(false)}
                aria-label="Close"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <form
              action={inviteAction}
              className="flex flex-col gap-4 px-5 py-4"
            >
              <p className="text-[13px] leading-relaxed text-[var(--text-mid)]">
                Enter the student&apos;s school email. Optionally set grade and
                a counselor. They finish signup with your school&apos;s access
                code once this invite is saved.
              </p>
              <div>
                <label
                  htmlFor="invite-email"
                  className="mb-2 block text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[var(--text-mid)]"
                >
                  Email
                </label>
                <input
                  id="invite-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="student@school.edu"
                  disabled={invitePending}
                  className="w-full rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-2.5 font-[family-name:var(--font-dm-sans)] text-[13px] outline-none placeholder:text-[var(--text-hint)] focus:border-[var(--green-light)] disabled:opacity-60"
                />
              </div>
              <div>
                <label
                  htmlFor="invite-grade"
                  className="mb-2 block text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[var(--text-mid)]"
                >
                  Grade (optional)
                </label>
                <select
                  id="invite-grade"
                  name="grade"
                  aria-label="Grade"
                  disabled={invitePending}
                  style={{ backgroundImage: SELECT_CHEVRON }}
                  className={`${filterSelectClass} w-full max-w-none`}
                  defaultValue=""
                >
                  <option value="">—</option>
                  {GRADE_FILTER_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="invite-counselor"
                  className="mb-2 block text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[var(--text-mid)]"
                >
                  Counselor (optional)
                </label>
                <select
                  id="invite-counselor"
                  name="counselorSchoolAdminId"
                  aria-label="Counselor"
                  disabled={invitePending}
                  style={{ backgroundImage: SELECT_CHEVRON }}
                  className={`${filterSelectClass} w-full max-w-none`}
                  defaultValue=""
                >
                  <option value="">—</option>
                  {counselorOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              {inviteState?.error ? (
                <p className="text-[13px] font-medium text-[#c0392b]">
                  {String(inviteState.error)}
                </p>
              ) : null}
              <div className="-mx-5 -mb-4 mt-2 flex justify-end gap-2 border-t border-[var(--border-light)] bg-[#faf9f4] px-5 py-3">
                <button
                  type="button"
                  className="cursor-pointer rounded-lg border-[1.5px] border-[var(--border)] bg-white px-4 py-2 text-[12.5px] font-semibold text-[var(--text-mid)] hover:border-[var(--text-hint)]"
                  onClick={() => setInviteOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={invitePending}
                  className="cursor-pointer rounded-lg border-[1.5px] border-[var(--green)] bg-[var(--green)] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[var(--green-dark)] disabled:opacity-55"
                >
                  {invitePending ? "Saving…" : "Send invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
