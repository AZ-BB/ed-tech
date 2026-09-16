"use client";

import {
  deleteAdminSchoolStudentInvite,
  getAdminSchoolPendingInvites,
  sendAdminSchoolInvitationReminders,
} from "@/actions/admin-students";
import type { PendingInviteRow } from "@/app/(protected)/school/students/_lib/fetch-pending-invites-page";
import { Pagination } from "@/components/pagination";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type AdminSchoolInvitationsDialogProps = {
  open: boolean;
  onClose: () => void;
  schoolId: string;
  schoolName: string;
};

export function AdminSchoolInvitationsDialog({
  open,
  onClose,
  schoolId,
  schoolName,
}: AdminSchoolInvitationsDialogProps) {
  const router = useRouter();
  const [searchDraft, setSearchDraft] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [rows, setRows] = useState<PendingInviteRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [allPendingCount, setAllPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [listVersion, setListVersion] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reminderPending, setReminderPending] = useState(false);
  const [reminderSummary, setReminderSummary] = useState<{
    sent: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prevQRef = useRef(q);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      setQ(searchDraft.trim());
    }, 320);
    return () => window.clearTimeout(id);
  }, [open, searchDraft]);

  useEffect(() => {
    if (prevQRef.current !== q) {
      prevQRef.current = q;
      setPage(1);
    }
  }, [q]);

  useEffect(() => {
    if (totalRows <= 0 || limit <= 0) return;
    const totalPages = Math.max(1, Math.ceil(totalRows / limit));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [totalRows, limit, page]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getAdminSchoolPendingInvites(schoolId, {
          q,
          page,
          limit,
        });
        if (cancelled) return;
        if (result.error) {
          setError(result.error);
          setRows([]);
          setTotalRows(0);
          return;
        }
        setRows(result.rows);
        setTotalRows(result.totalRows);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, schoolId, q, page, limit, listVersion]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    void getAdminSchoolPendingInvites(schoolId, { q: "", page: 1, limit: 1 }).then(
      (result) => {
        if (cancelled || result.error) return;
        setAllPendingCount(result.totalRows);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [open, schoolId, listVersion]);

  if (!open) return null;

  function handleClose() {
    setSearchDraft("");
    setQ("");
    prevQRef.current = "";
    setPage(1);
    setLimit(10);
    setError(null);
    setReminderSummary(null);
    onClose();
  }

  async function handleSendReminders() {
    if (allPendingCount === 0) return;

    const ok = window.confirm(
      `Send a reminder email to all ${allPendingCount} pending invitation${allPendingCount === 1 ? "" : "s"}?`,
    );
    if (!ok) return;

    setReminderPending(true);
    setError(null);
    setReminderSummary(null);

    try {
      const result = await sendAdminSchoolInvitationReminders(schoolId);
      if (result.error) {
        setError(result.error);
        return;
      }

      setReminderSummary({
        sent: result.sent,
        failed: result.failed,
        errors: result.errors,
      });
    } finally {
      setReminderPending(false);
    }
  }

  async function handleRemoveInvite(row: PendingInviteRow) {
    const ok = window.confirm(
      `Remove the invitation for ${row.email}? They will need a new invite to join.`,
    );
    if (!ok) return;

    setDeleteId(row.id);
    setError(null);
    try {
      const result = await deleteAdminSchoolStudentInvite(schoolId, row.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setListVersion((value) => value + 1);
      router.refresh();
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-school-invitations-title"
        className="flex max-h-[min(90vh,720px)] w-full max-w-[720px] flex-col overflow-hidden rounded-[12px] border border-[#e0deda] bg-white shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#e0deda] px-6 py-4">
          <div>
            <h2
              id="admin-school-invitations-title"
              className="text-[18px] font-semibold text-[#1a1a1a]"
            >
              Invitations
            </h2>
            <p className="mt-1 text-[13px] text-[#666]">
              Students invited to <strong>{schoolName}</strong> who have not signed up yet.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[8px] text-[#666] hover:bg-[#faf9f7] hover:text-[#1a1a1a]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="shrink-0 border-b border-[#e0deda] bg-[#faf9f7] px-6 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[220px] flex-1">
              <label htmlFor="admin-school-invitations-search" className="sr-only">
                Search by email
              </label>
              <input
                id="admin-school-invitations-search"
                type="search"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Search by email"
                disabled={loading || reminderPending}
                className="w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#4a4a4a] outline-none placeholder:text-[#999] focus:border-[#40916C] disabled:opacity-60"
              />
            </div>
            <button
              type="button"
              onClick={handleSendReminders}
              disabled={loading || reminderPending || allPendingCount === 0}
              className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#1B4332] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {reminderPending ? "Sending reminders…" : "Send a reminder"}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
          {error ? <p className="mb-3 text-[13px] text-red-600">{error}</p> : null}

          {reminderSummary ? (
            <div className="mb-3 rounded-[8px] border border-[#e0deda] bg-[#faf9f7] p-3 text-[13px] text-[#4a4a4a]">
              <p>Reminders sent: {reminderSummary.sent}</p>
              <p>Failed: {reminderSummary.failed}</p>
              {reminderSummary.errors.length > 0 ? (
                <ul className="mt-2 max-h-32 list-disc overflow-y-auto pl-5">
                  {reminderSummary.errors.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {loading && rows.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[#666]">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[#666]">
              {q ? "No invitations match this search." : "No unanswered invitations right now."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className="whitespace-nowrap bg-[#faf9f7] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#666]">
                      Email
                    </th>
                    <th className="whitespace-nowrap bg-[#faf9f7] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#666]">
                      Grade
                    </th>
                    <th className="whitespace-nowrap bg-[#faf9f7] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#666]">
                      Invited
                    </th>
                    <th className="whitespace-nowrap bg-[#faf9f7] px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[#666]">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-[#ece9e4] last:border-b-0">
                      <td className="max-w-[220px] truncate px-3 py-2.5 font-medium text-[#1a1a1a]">
                        {row.email}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[#4a4a4a]">
                        {row.grade ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-[#4a4a4a]">
                        {row.invitedLabel}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                        <button
                          type="button"
                          className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[#c0392b] transition-colors hover:bg-[#fdf2f2] disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={loading || deleteId === row.id}
                          onClick={() => handleRemoveInvite(row)}
                        >
                          {deleteId === row.id ? "Removing…" : "Remove"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[#e0deda] bg-[#faf9f7] px-6 py-3">
          <Pagination
            totalRows={totalRows}
            page={page}
            limit={limit}
            limitOptions={[5, 10, 20]}
            syncSearchParams={false}
            onChange={({ page: nextPage, limit: nextLimit }) => {
              setPage(nextPage);
              setLimit(nextLimit);
            }}
          />
        </div>
      </div>
    </div>
  );
}
