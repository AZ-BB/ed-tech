"use client";

import {
  deleteSchoolStudentInvite,
  getPendingSchoolInvites,
  getSchoolStudentsFullExportRows,
  inviteSchoolStudentEmail,
  type PendingInviteRow,
} from "@/actions/school-students";
import { bulkCreateSchoolStudentTasks } from "@/actions/school-tasks";
import type { SchoolStudentTableRow } from "@/app/(protected)/school/students/_lib/fetch-school-students-page";
import { Pagination } from "@/components/pagination";
import type { DestinationSelectItem } from "@/lib/school-portal-destination-options";
import { GRADE_FILTER_OPTIONS } from "@/lib/school-portal-destination-options";
import type { GeneralResponse } from "@/utils/response";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22 viewBox=%220 0 10 6%22 fill=%22none%22%3E%3Cpath d=%22M1 1l4 4 4-4%22 stroke=%22%236a6a6a%22 stroke-width=%221.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/%3E%3C/svg%3E")';

const filterSelectClass =
  "rounded-[8px] border-[1.5px] border-[var(--border)] bg-white px-3 py-2 text-[12.5px] font-medium text-[var(--text-mid)] outline-none appearance-none bg-[length:10px_6px] bg-[position:right_10px_center] bg-no-repeat pr-9 cursor-pointer transition-colors focus:border-[var(--green-light)] disabled:opacity-55";

/** Some mail clients / browsers reject very long `mailto:` URLs. */
const MAILTO_MAX_LEN = 1800;

function escapeCsvField(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Empty, whitespace-only, and UI placeholder em-dash export as "-". */
function csvCell(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return escapeCsvField("-");
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return escapeCsvField("-");
    return escapeCsvField(String(raw));
  }
  const t = raw.trim();
  if (t === "" || t === "—") return escapeCsvField("-");
  return escapeCsvField(t);
}

const STUDENT_CSV_HEADERS = [
  "First name",
  "Last name",
  "Email",
  "Grade",
  "Destinations",
  "Programs",
  "Profile %",
  "Unis",
  "Last active",
  "Counselor",
] as const;

function studentRowsToCsvLines(rows: SchoolStudentTableRow[]): string[] {
  return [
    STUDENT_CSV_HEADERS.map((h) => escapeCsvField(h)).join(","),
    ...rows.map((r) =>
      [
        r.firstName,
        r.lastName,
        r.email,
        r.grade,
        r.destinationsSummary,
        r.programsSummary,
        r.profilePercent,
        r.unisCount,
        r.lastActiveLabel,
        r.counselorLabel,
      ]
        .map(csvCell)
        .join(","),
    ),
  ];
}

function triggerCsvDownload(lines: string[], filename: string) {
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadSelectedStudentsCsv(
  rows: SchoolStudentTableRow[],
  selectedIds: Set<string>,
) {
  const sel = rows.filter((r) => selectedIds.has(r.id));
  triggerCsvDownload(studentRowsToCsvLines(sel), "students-export.csv");
}

function recipientsPreviewText(
  rows: SchoolStudentTableRow[],
  selectedIds: Set<string>,
): string {
  const names = rows
    .filter((r) => selectedIds.has(r.id))
    .map((r) => `${r.firstName} ${r.lastName}`.trim());
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;
}

function RowCheck({
  checked,
  onToggle,
  ariaLabel,
}: {
  checked: boolean;
  onToggle: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={checked}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
      }}
      className={`inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border-[1.5px] align-middle transition-colors ${
        checked
          ? "border-[#2D6A4F] bg-[#2D6A4F] hover:border-[#1B4332] hover:bg-[#1B4332]"
          : "border-[#e0deda] bg-white hover:border-[#40916C]"
      }`}
    >
      {checked ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none h-2.5 w-2.5 shrink-0"
          aria-hidden
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ) : null}
    </button>
  );
}

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkTaskOpen, setBulkTaskOpen] = useState(false);
  const [bulkTitle, setBulkTitle] = useState("");
  const [bulkDue, setBulkDue] = useState("");
  const [bulkPriority, setBulkPriority] = useState("medium");
  const [bulkNotes, setBulkNotes] = useState("");
  const [bulkSubmitError, setBulkSubmitError] = useState<string | null>(null);
  const [isBulkPending, startBulkTransition] = useTransition();
  const [isExportAllPending, startExportAllTransition] = useTransition();
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

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, q, grade, dest, limit]);

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

  const selectedCount = selectedIds.size;
  const allPageSelected =
    rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

  function toggleRowSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const r of rows) next.delete(r.id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const r of rows) next.add(r.id);
        return next;
      });
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function openBulkTaskModal() {
    setBulkSubmitError(null);
    setBulkTitle("");
    setBulkDue("");
    setBulkPriority("medium");
    setBulkNotes("");
    setBulkTaskOpen(true);
  }

  function handleBulkEmail() {
    const emails = rows
      .filter((r) => selectedIds.has(r.id))
      .map((r) => r.email.trim())
      .filter(Boolean);
    if (emails.length === 0) return;
    const bcc = emails.join(",");
    const href = `mailto:?bcc=${encodeURIComponent(bcc)}`;
    if (href.length <= MAILTO_MAX_LEN) {
      window.location.href = href;
      return;
    }
    const first = emails[0];
    if (first) {
      window.location.href = `mailto:${encodeURIComponent(first)}`;
    }
    void navigator.clipboard.writeText(bcc).then(() => {
      window.alert(
        "Too many addresses for one email draft. Opened your mail app for the first student; all addresses were copied to your clipboard.",
      );
    }).catch(() => {
      window.alert(
        "Too many addresses for one email draft, and copying to clipboard failed. Try selecting fewer students.",
      );
    });
  }

  function handleBulkExport() {
    downloadSelectedStudentsCsv(rows, selectedIds);
  }

  function handleExportAllCsv() {
    startExportAllTransition(async () => {
      const res = await getSchoolStudentsFullExportRows(q, grade, dest);
      if (res.error || res.data === null) {
        window.alert(String(res.error ?? "Could not export students."));
        return;
      }
      const day = new Date().toISOString().slice(0, 10);
      triggerCsvDownload(
        studentRowsToCsvLines(res.data),
        `school-students-all-${day}.csv`,
      );
    });
  }

  function confirmBulkTask() {
    const title = bulkTitle.trim();
    const due = bulkDue.trim();
    const notes = bulkNotes.trim();
    if (!title) {
      setBulkSubmitError("Task title required");
      return;
    }
    if (!due) {
      setBulkSubmitError("Due date required");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) {
      setBulkSubmitError("Pick a valid due date.");
      return;
    }
    setBulkSubmitError(null);
    const fd = new FormData();
    fd.set("student_ids", JSON.stringify([...selectedIds]));
    fd.set("title", title);
    fd.set("due_date", due);
    fd.set("priority", bulkPriority);
    fd.set("notes", notes);
    startBulkTransition(async () => {
      const res = await bulkCreateSchoolStudentTasks(null, fd);
      if (res.error) {
        setBulkSubmitError(String(res.error));
        return;
      }
      setBulkTaskOpen(false);
      clearSelection();
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[14px] border border-[var(--border-light)] bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-light)] px-5 py-4 sm:flex-nowrap">
          <div>
            <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-[var(--text)]">
              <span className="flex h-6 w-6 items-center justify-center rounded-[8px] bg-[var(--green-bg)] text-[var(--green)] [&_svg]:h-[13px] [&_svg]:w-[13px]">
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
              className="inline-flex cursor-pointer items-center gap-2 rounded-[8px] border-[1.5px] border-[var(--border)] bg-white px-4 py-2 text-[12.5px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleExportAllCsv}
              disabled={isExportAllPending || totalRows === 0}
            >
              {isExportAllPending ? "Exporting…" : "Export all (CSV)"}
            </button>
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-2 rounded-[8px] border-[1.5px] border-[var(--border)] bg-white px-4 py-2 text-[12.5px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)]"
              onClick={openPendingModal}
            >
              Pending invites
            </button>
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-2 rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-[var(--green-dark)]"
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
              className="w-full rounded-[8px] border-[1.5px] border-[var(--border)] bg-white py-2 pl-8 pr-3 font-[family-name:var(--font-dm-sans)] text-[12.5px] outline-none placeholder:text-[var(--text-hint)] focus:border-[var(--green-light)]"
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
            className="rounded-[8px] border-[1.5px] border-[var(--border)] bg-white px-4 py-2 text-[12.5px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)]"
          >
            Apply
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-[13px]">
            <thead>
              <tr>
                <th
                  className="w-9 whitespace-nowrap bg-[#faf9f4] py-2.5 pl-5 pr-0 text-left align-middle"
                  aria-label="Select all on this page"
                >
                  <RowCheck
                    checked={allPageSelected}
                    onToggle={toggleSelectAllOnPage}
                    ariaLabel="Select all students on this page"
                  />
                </th>
                <th className="whitespace-nowrap bg-[#faf9f4] px-5 py-2.5 pl-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
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
                    colSpan={9}
                  >
                    No students match your filters yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    role="link"
                    tabIndex={0}
                    aria-label={`View ${r.firstName} ${r.lastName}`}
                    className="group cursor-pointer border-b border-[var(--border-light)] transition-colors last:border-b-0 hover:bg-[#faf9f4] focus-visible:bg-[#faf9f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--green)]"
                    onClick={() => router.push(`/school/students/${r.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/school/students/${r.id}`);
                      }
                    }}
                  >
                    <td
                      className="py-3 pl-5 pr-0 align-middle"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <RowCheck
                        checked={selectedIds.has(r.id)}
                        onToggle={() => toggleRowSelection(r.id)}
                        ariaLabel={`Select ${r.firstName} ${r.lastName}`}
                      />
                    </td>
                    <td className="py-3 pl-3 pr-3 align-middle">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] text-[11.5px] font-semibold text-[var(--green-dark)]">
                          {(r.firstName[0] ?? "?").toUpperCase()}
                          {(r.lastName[0] ?? "").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold leading-tight text-[var(--text)] group-hover:text-[var(--green-dark)]">
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

      <div
        className={`fixed bottom-6 left-1/2 z-[150] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap items-center gap-3.5 rounded-[14px] bg-[var(--green-dark)] px-5 py-3 text-white shadow-[0_12px_32px_rgba(15,30,20,0.08)] transition-all duration-200 ${
          selectedCount > 0
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-[60px] opacity-0"
        }`}
        aria-hidden={selectedCount === 0}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-[13px] font-semibold">
          <strong className="font-[family-name:var(--font-dm-serif)] text-[18px] font-normal leading-none text-[var(--green-bright)]">
            {selectedCount}
          </strong>
          <span className="whitespace-nowrap">students selected</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border-[1.5px] border-[var(--green-bright)] bg-[var(--green-bright)] px-2.5 py-1 text-[11.5px] font-semibold leading-none text-[var(--green-dark)] transition-colors hover:border-[#7DD8A8] hover:bg-[#7DD8A8] hover:text-[var(--green-dark)]"
            onClick={openBulkTaskModal}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="h-[13px] w-[13px]"
              aria-hidden
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Assign task
          </button>
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border-[1.5px] border-white/25 bg-transparent px-2.5 py-1 text-[11.5px] font-semibold leading-none text-white transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white"
            onClick={handleBulkEmail}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-[13px] w-[13px]"
              aria-hidden
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6" />
            </svg>
            Email
          </button>
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border-[1.5px] border-white/25 bg-transparent px-2.5 py-1 text-[11.5px] font-semibold leading-none text-white transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white"
            onClick={handleBulkExport}
          >
            Export
          </button>
        </div>
        <button
          type="button"
          className="cursor-pointer border-l border-white/15 pl-3.5 text-[12px] text-white/50 transition-colors hover:text-white"
          onClick={clearSelection}
        >
          Clear
        </button>
      </div>

      {bulkTaskOpen ? (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <div
          role="presentation"
          className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(15,30,20,0.5)] p-5"
          onClick={() => setBulkTaskOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setBulkTaskOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Assign task to selected students"
            tabIndex={-1}
            className="max-h-[90vh] w-full max-w-[480px] overflow-hidden rounded-[14px] bg-white shadow-[0_12px_32px_rgba(15,30,20,0.08)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-light)] px-[22px] py-[18px]">
              <h3 className="font-[family-name:var(--font-dm-serif)] text-xl tracking-tight text-[var(--text)]">
                Assign task to selected students
              </h3>
              <button
                type="button"
                className="flex cursor-pointer items-center justify-center rounded-md p-1.5 text-[var(--text-light)] hover:bg-[#faf9f4] hover:text-[var(--text)]"
                onClick={() => setBulkTaskOpen(false)}
                aria-label="Close"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col gap-3.5 px-[22px] py-[18px]">
              <div className="rounded-[8px] border border-[var(--green-bg)] bg-[var(--green-pale)] px-3 py-2.5 text-[12px] text-[var(--text-light)]">
                Assigning to{" "}
                <strong className="font-semibold text-[var(--green-dark)]">
                  {selectedCount} student{selectedCount !== 1 ? "s" : ""}
                </strong>
                {selectedCount > 0 ? (
                  <>
                    {" "}
                    · {recipientsPreviewText(rows, selectedIds)}
                  </>
                ) : null}
              </div>
              <div>
                <label
                  htmlFor="bulk-task-title"
                  className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[var(--text-mid)]"
                >
                  Task title
                </label>
                <input
                  id="bulk-task-title"
                  type="text"
                  value={bulkTitle}
                  onChange={(e) => setBulkTitle(e.target.value)}
                  placeholder="e.g. Submit personal statement V2"
                  disabled={isBulkPending}
                  className="w-full rounded-[8px] border-[1.5px] border-[var(--border)] bg-white px-3 py-2.5 font-[family-name:var(--font-dm-sans)] text-[13px] outline-none placeholder:text-[var(--text-hint)] focus:border-[var(--green-light)] disabled:opacity-60"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    htmlFor="bulk-task-due"
                    className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[var(--text-mid)]"
                  >
                    Due date
                  </label>
                  <input
                    id="bulk-task-due"
                    type="date"
                    value={bulkDue}
                    onChange={(e) => setBulkDue(e.target.value)}
                    disabled={isBulkPending}
                    className="w-full rounded-[8px] border-[1.5px] border-[var(--border)] bg-white px-3 py-2.5 font-[family-name:var(--font-dm-sans)] text-[13px] outline-none focus:border-[var(--green-light)] disabled:opacity-60"
                  />
                </div>
                <div>
                  <label
                    htmlFor="bulk-task-prio"
                    className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[var(--text-mid)]"
                  >
                    Priority
                  </label>
                  <select
                    id="bulk-task-prio"
                    value={bulkPriority}
                    onChange={(e) => setBulkPriority(e.target.value)}
                    disabled={isBulkPending}
                    style={{ backgroundImage: SELECT_CHEVRON }}
                    className={`${filterSelectClass} w-full max-w-none`}
                  >
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label
                  htmlFor="bulk-task-note"
                  className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[var(--text-mid)]"
                >
                  Optional note
                </label>
                <textarea
                  id="bulk-task-note"
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  placeholder="Anything specific the student should know..."
                  rows={3}
                  disabled={isBulkPending}
                  className="min-h-[60px] w-full resize-y rounded-[8px] border-[1.5px] border-[var(--border)] bg-white px-3 py-2.5 font-[family-name:var(--font-dm-sans)] text-[13px] outline-none placeholder:text-[var(--text-hint)] focus:border-[var(--green-light)] disabled:opacity-60"
                />
              </div>
              {bulkSubmitError ? (
                <p className="text-[12px] font-medium text-[#c0392b]">
                  {bulkSubmitError}
                </p>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--border-light)] bg-[#faf9f4] px-[22px] py-3.5">
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border-[1.5px] border-[var(--border)] bg-white px-2.5 py-1 text-[11.5px] font-semibold leading-none text-[var(--text-mid)] transition-colors hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)]"
                onClick={() => setBulkTaskOpen(false)}
                disabled={isBulkPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-2.5 py-1 text-[11.5px] font-semibold leading-none text-white transition-colors hover:border-[var(--green-dark)] hover:bg-[var(--green-dark)] disabled:opacity-55"
                onClick={confirmBulkTask}
                disabled={isBulkPending}
              >
                {isBulkPending ? "Assigning…" : "Assign task"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
            className="flex max-h-[min(90vh,720px)] w-full max-w-[720px] flex-col overflow-hidden rounded-[14px] bg-white shadow-[0_12px_32px_rgba(15,30,20,.12)]"
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
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[8px] text-[var(--text-light)] hover:bg-[#faf9f4] hover:text-[var(--text)]"
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
                  className="w-full rounded-[8px] border-[1.5px] border-[var(--border)] bg-white py-2 pl-8 pr-3 font-[family-name:var(--font-dm-sans)] text-[12.5px] outline-none placeholder:text-[var(--text-hint)] focus:border-[var(--green-light)] disabled:opacity-60"
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
                              className="cursor-pointer rounded-[8px] border border-[var(--border)] bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[#c0392b] transition-colors hover:bg-[#fdf2f2] disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={
                                pendingLoading || pendingDeleteId === r.id
                              }
                              onClick={() => handleRemoveInvite(r)}
                            >
                              {pendingDeleteId === r.id
                                ? "Removing…"
                                : "Remove"}
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
            className="w-full max-w-[440px] overflow-hidden rounded-[14px] bg-white shadow-[0_12px_32px_rgba(15,30,20,.12)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-light)] px-5 py-4">
              <h3 className="font-[family-name:var(--font-dm-serif)] text-xl tracking-tight text-[var(--text)]">
                Add student
              </h3>
              <button
                type="button"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[8px] text-[var(--text-light)] hover:bg-[#faf9f4] hover:text-[var(--text)]"
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
                  className="w-full rounded-[8px] border-[1.5px] border-[var(--border)] bg-white px-3 py-2.5 font-[family-name:var(--font-dm-sans)] text-[13px] outline-none placeholder:text-[var(--text-hint)] focus:border-[var(--green-light)] disabled:opacity-60"
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
                  className="cursor-pointer rounded-[8px] border-[1.5px] border-[var(--border)] bg-white px-4 py-2 text-[12.5px] font-semibold text-[var(--text-mid)] hover:border-[var(--text-hint)]"
                  onClick={() => setInviteOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={invitePending}
                  className="cursor-pointer rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[var(--green-dark)] disabled:opacity-55"
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
