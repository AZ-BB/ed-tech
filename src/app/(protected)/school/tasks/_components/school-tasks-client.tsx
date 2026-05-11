"use client";

import type {
  SchoolStudentPickerOption,
  SchoolTaskTableRow,
} from "@/app/(protected)/school/tasks/_lib/fetch-school-tasks-page";
import {
  createSchoolStudentTask,
  toggleSchoolStudentTask,
} from "@/actions/school-tasks";
import { Pagination } from "@/components/pagination";
import type { GeneralResponse } from "@/utils/response";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

const filterSelectClass =
  "rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-2 text-[12.5px] font-medium text-[var(--text-mid)] outline-none appearance-none bg-[length:10px_6px] bg-[position:right_10px_center] bg-no-repeat pr-9 cursor-pointer transition-colors focus:border-[var(--green-light)]";

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22 viewBox=%220 0 10 6%22 fill=%22none%22%3E%3Cpath d=%22M1 1l4 4 4-4%22 stroke=%22%236a6a6a%22 stroke-width=%221.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/%3E%3C/svg%3E")';

function ymdLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isTaskDueOverdue(dueDate: string | null, completed: boolean) {
  if (completed || !dueDate) return false;
  const today = ymdLocal(new Date());
  return dueDate.slice(0, 10) < today;
}

function formatDue(due: string | null) {
  if (!due) return "";
  try {
    return new Date(due).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return due;
  }
}

function metaDescriptionSnippet(text: string, max = 72) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function initials(first: string, last: string) {
  const a = first.trim()[0];
  const b = last.trim()[0];
  const pair = `${a ?? ""}${b ?? ""}`.toUpperCase();
  return pair || "?";
}

function priorityPill(priority: string) {
  const p = priority.toLowerCase();
  if (p === "high") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(231,76,60,0.12)] px-[7px] py-px text-[10.5px] font-bold text-[#8c2d22]">
        <span
          className="h-1 w-1 shrink-0 rounded-full bg-[var(--red)]"
          aria-hidden
        />
        High
      </span>
    );
  }
  if (p === "medium") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(212,162,42,0.14)] px-[7px] py-px text-[10.5px] font-bold text-[#7a5d10]">
        <span
          className="h-1 w-1 shrink-0 rounded-full bg-[#D4A22A]"
          aria-hidden
        />
        Medium
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#ECEAE5] px-[7px] py-px text-[10.5px] font-bold text-[var(--text-mid)]">
      <span
        className="h-1 w-1 shrink-0 rounded-full bg-[#a0a0a0]"
        aria-hidden
      />
      Low
    </span>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    </svg>
  );
}

export type SchoolTasksClientProps = {
  rows: SchoolTaskTableRow[];
  totalRows: number;
  page: number;
  limit: number;
  q: string;
  when: string;
  priority: string;
  status: string;
  studentOptions: SchoolStudentPickerOption[];
  variant?: "all" | "studentProfile";
  /** Required when variant is studentProfile — scopes tasks and create form. */
  scopedStudentId?: string;
  /** When set, modal open state is controlled (e.g. sidebar “+ Add task”). */
  newTaskModal?: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  };
};

export function SchoolTasksClient({
  rows,
  totalRows,
  page,
  limit,
  q,
  when,
  priority,
  status,
  studentOptions,
  variant = "all",
  scopedStudentId,
  newTaskModal: controlledNewTaskModal,
}: SchoolTasksClientProps) {
  const router = useRouter();
  const [internalNewOpen, setInternalNewOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const createPrevPending = useRef(false);

  const isStudentProfile = variant === "studentProfile";
  const filterAction = isStudentProfile
    ? `/school/students/${scopedStudentId ?? ""}`
    : "/school/tasks";

  const newOpen = controlledNewTaskModal?.open ?? internalNewOpen;
  const setNewOpen = (open: boolean) => {
    if (controlledNewTaskModal) {
      controlledNewTaskModal.onOpenChange(open);
    } else {
      setInternalNewOpen(open);
    }
  };

  const filterActive =
    q.trim().length > 0 ||
    when === "overdue" ||
    when === "week" ||
    priority === "high" ||
    priority === "medium" ||
    priority === "low" ||
    status === "open" ||
    status === "complete";

  const [createState, createAction, createPending] = useActionState(
    createSchoolStudentTask,
    null as GeneralResponse<null> | null,
  );

  useEffect(() => {
    const finished = createPrevPending.current && !createPending;
    if (finished && createState?.error === null) {
      setNewOpen(false);
      router.refresh();
    }
    createPrevPending.current = createPending;
  }, [createPending, createState, router]);

  useEffect(() => {
    if (!newOpen) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !createPending) setNewOpen(false);
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [newOpen, createPending]);

  async function handleToggle(row: SchoolTaskTableRow) {
    setTogglingId(row.taskId);
    try {
      const res = await toggleSchoolStudentTask(row.taskId);
      if ("error" in res) {
        window.alert(res.error);
        return;
      }
      router.refresh();
    } finally {
      setTogglingId(null);
    }
  }

  const canCreateTask = isStudentProfile
    ? Boolean(scopedStudentId?.trim())
    : studentOptions.length > 0;

  const searchInputId = "school-task-search";

  const panelRound = isStudentProfile ? "rounded-[14px]" : "rounded-[var(--radius-lg)]";
  const headPad = isStudentProfile ? "px-5 py-[18px]" : "px-5 py-4";
  const bodyPad = isStudentProfile ? "px-5 py-[18px]" : "px-5 py-4";

  return (
    <div className="space-y-4">
      <div
        className={`overflow-hidden border border-[var(--border-light)] bg-white ${panelRound}`}
      >
        <div
          className={`flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-light)] ${headPad}`}
        >
          {isStudentProfile ? (
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-[var(--text)]">
                Tasks / next actions
                <span className="font-normal text-[var(--text-light)]">
                  {" "}
                  ({totalRows})
                </span>
              </h2>
              <p className="mt-0.5 text-[12px] text-[var(--text-light)]">
                Track what needs to happen, by when, what priority
              </p>
            </div>
          ) : (
            <div>
              <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-[var(--text)]">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--green-bg)] text-[var(--green)] [&_svg]:h-[13px] [&_svg]:w-[13px]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                  </svg>
                </span>
                All tasks
                <span className="font-normal text-[var(--text-light)]">
                  {" "}
                  ({totalRows})
                </span>
              </h2>
              <p className="mt-1 text-[12px] text-[var(--text-light)]">
                What needs to happen next, by when, and for which student (from
                My Applications tasks).
              </p>
            </div>
          )}
          <button
            type="button"
            className={
              isStudentProfile
                ? "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border-[1.5px] border-[var(--green)] bg-[var(--green)] px-2.5 py-1 text-[11.5px] font-semibold text-white transition-colors hover:bg-[var(--green-dark)] disabled:cursor-not-allowed disabled:opacity-50"
                : "inline-flex cursor-pointer items-center gap-2 rounded-lg border-[1.5px] border-[var(--green)] bg-[var(--green)] px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-[var(--green-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            }
            disabled={!canCreateTask}
            title={
              !canCreateTask
                ? isStudentProfile
                  ? "Cannot create task for this profile"
                  : "Add enrolled students before creating tasks"
                : undefined
            }
            onClick={() => setNewOpen(true)}
          >
            + New task
          </button>
        </div>

        {!isStudentProfile ? (
          <form
            className="flex flex-wrap items-center gap-2 border-b border-[var(--border-light)] bg-[#faf9f4] px-5 py-3.5"
            action={filterAction}
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
            <label htmlFor={searchInputId} className="sr-only">
              Search tasks
            </label>
            <input
              id={searchInputId}
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search tasks"
              className="w-full rounded-lg border-[1.5px] border-[var(--border)] bg-white py-2 pl-8 pr-3 font-[family-name:var(--font-dm-sans)] text-[12.5px] outline-none placeholder:text-[var(--text-hint)] focus:border-[var(--green-light)]"
            />
          </div>
          <select
            name="when"
            className={`${filterSelectClass} min-w-[130px]`}
            style={{ backgroundImage: SELECT_CHEVRON }}
            defaultValue={when}
            aria-label="Due time"
          >
            <option value="">All time</option>
            <option value="overdue">Overdue</option>
            <option value="week">Due this week</option>
          </select>
          <select
            name="priority"
            className={`${filterSelectClass} min-w-[130px]`}
            style={{ backgroundImage: SELECT_CHEVRON }}
            defaultValue={priority}
            aria-label="Priority"
          >
            <option value="">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            name="status"
            className={`${filterSelectClass} min-w-[140px]`}
            style={{ backgroundImage: SELECT_CHEVRON }}
            defaultValue={status}
            aria-label="Status"
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="complete">Complete</option>
          </select>
          <button
            type="submit"
            className="rounded-lg border-[1.5px] border-[var(--border)] bg-white px-4 py-2 text-[12.5px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)]"
          >
            Apply
          </button>
        </form>
        ) : null}

        <div className={bodyPad}>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[var(--text-light)]">
              {isStudentProfile
                ? "No tasks yet. Create one with “New task” or wait for tasks from their workspace."
                : !filterActive && totalRows === 0
                  ? "No tasks yet. Create one with “New task” or wait for students to receive tasks from their workspace."
                  : "No tasks match your filters."}
            </p>
          ) : (
            <div className={isStudentProfile ? "flex flex-col gap-[7px]" : "space-y-[7px]"}>
              {rows.map((r) => {
                const overdue = isTaskDueOverdue(r.dueDate, r.completed);
                const done = Boolean(r.completed);
                const studentName =
                  `${r.firstName} ${r.lastName}`.trim() || r.email;
                const descTrim = r.description?.trim() ?? "";
                const metaNote =
                  isStudentProfile && descTrim
                    ? metaDescriptionSnippet(descTrim)
                    : null;

                return (
                  <div
                    key={r.taskId}
                    className={
                      isStudentProfile
                        ? "flex items-center gap-3 rounded-[10px] border border-[var(--border-light)] bg-white px-[14px] py-[11px]"
                        : `flex items-center gap-3 rounded-[10px] border border-[var(--border-light)] px-3.5 py-[11px] ${
                            done ? "bg-[#faf9f4]" : "bg-white"
                          }`
                    }
                  >
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={done}
                      title={done ? "Mark open" : "Mark complete"}
                      disabled={togglingId === r.taskId}
                      onClick={() => handleToggle(r)}
                      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-[var(--border)] bg-white transition-colors hover:border-[var(--green-light)] disabled:cursor-wait disabled:opacity-50 ${
                        done
                          ? "border-[var(--green-bright)] bg-[var(--green-bright)]"
                          : ""
                      }`}
                    >
                      <svg
                        className={done ? "block text-white" : "hidden"}
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        aria-hidden
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </button>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-[13.5px] font-semibold ${
                          done
                            ? "text-[var(--text-light)] line-through"
                            : "text-[var(--text)]"
                        }`}
                      >
                        {r.title}
                      </div>
                      {!isStudentProfile && descTrim ? (
                        <p
                          className={`mt-1 whitespace-pre-wrap text-[12px] leading-snug ${
                            done
                              ? "text-[var(--text-hint)] line-through"
                              : "text-[var(--text-mid)]"
                          }`}
                        >
                          {descTrim}
                        </p>
                      ) : null}
                      <div
                        className={`mt-[2px] flex flex-wrap items-center text-[11.5px] text-[var(--text-light)] ${
                          isStudentProfile ? "gap-2.5" : "gap-2"
                        }`}
                      >
                        {!isStudentProfile ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] text-[9px] font-semibold text-[var(--green-dark)]">
                              {initials(r.firstName, r.lastName)}
                            </span>
                            {studentName}
                          </span>
                        ) : null}
                        {isStudentProfile ? (
                          <span className="inline-flex items-center gap-1">
                            <CalendarIcon className="shrink-0 text-[var(--text-hint)]" />
                            {r.dueDate ? (
                              <span
                                className={
                                  overdue && !done
                                    ? "font-semibold text-[var(--red)]"
                                    : undefined
                                }
                              >
                                {formatDue(r.dueDate)}
                                {overdue && !done ? " · OVERDUE" : ""}
                              </span>
                            ) : (
                              <span>No due date</span>
                            )}
                          </span>
                        ) : r.dueDate ? (
                          <span
                            className={
                              overdue && !done
                                ? "font-semibold text-[var(--red)]"
                                : undefined
                            }
                          >
                            {formatDue(r.dueDate)}
                            {overdue && !done ? " · OVERDUE" : ""}
                          </span>
                        ) : (
                          <span>No due date</span>
                        )}
                        {priorityPill(r.priority)}
                        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-[7px] py-px text-[10.5px] font-semibold text-[var(--text-mid)]">
                          {done ? "Complete" : "Open"}
                        </span>
                        {metaNote ? (
                          <span
                            className={
                              done
                                ? "text-[var(--text-hint)] line-through"
                                : undefined
                            }
                          >
                            · {metaNote}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

      {newOpen ? (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <div
          role="presentation"
          className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(15,30,20,0.5)] px-4 py-6"
          onClick={() => {
            if (!createPending) setNewOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !createPending) setNewOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-task-title"
            tabIndex={-1}
            className="flex max-h-[min(90vh,640px)] w-full max-w-[480px] flex-col overflow-hidden rounded-[var(--radius-lg)] bg-white shadow-[0_12px_32px_rgba(15,30,20,.12)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 border-b border-[var(--border-light)] px-5 py-4">
              <h3
                id="new-task-title"
                className="font-[family-name:var(--font-dm-serif)] text-xl tracking-tight text-[var(--text)]"
              >
                New task
              </h3>
              <p className="mt-1 text-[12px] text-[var(--text-light)]">
                Assign a task to a student at your school. They will see it in
                My Applications.
              </p>
            </div>
            <form
              action={createAction}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 space-y-3 overflow-y-auto px-5 py-4">
                {isStudentProfile && scopedStudentId ? (
                  <input type="hidden" name="student_id" value={scopedStudentId} />
                ) : (
                  <div>
                    <label
                      htmlFor="nt-student"
                      className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-mid)]"
                    >
                      Student
                    </label>
                    <select
                      id="nt-student"
                      name="student_id"
                      required
                      className="mt-1.5 w-full rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-2.5 text-[13px] text-[var(--text)] outline-none focus:border-[var(--green-light)]"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Select student…
                      </option>
                      {studentOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label
                    htmlFor="nt-title"
                    className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-mid)]"
                  >
                    Title
                  </label>
                  <input
                    id="nt-title"
                    name="title"
                    required
                    placeholder="e.g. Upload final transcript"
                    className="mt-1.5 w-full rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-2.5 text-[13px] text-[var(--text)] outline-none focus:border-[var(--green-light)]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="nt-desc"
                    className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-mid)]"
                  >
                    Description{" "}
                    <span className="font-normal normal-case text-[var(--text-hint)]">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    id="nt-desc"
                    name="description"
                    rows={3}
                    placeholder="Add context or steps for the student…"
                    className="mt-1.5 w-full resize-y rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-2.5 text-[13px] text-[var(--text)] outline-none focus:border-[var(--green-light)]"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="nt-prio"
                      className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-mid)]"
                    >
                      Priority
                    </label>
                    <select
                      id="nt-prio"
                      name="priority"
                      defaultValue="medium"
                      className="mt-1.5 w-full rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-2.5 text-[13px] text-[var(--text)] outline-none focus:border-[var(--green-light)]"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="nt-due"
                      className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--text-mid)]"
                    >
                      Due date
                    </label>
                    <input
                      id="nt-due"
                      name="due_date"
                      type="date"
                      className="mt-1.5 w-full rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-2.5 text-[13px] text-[var(--text)] outline-none focus:border-[var(--green-light)]"
                    />
                  </div>
                </div>
                {createState?.error ? (
                  <p className="text-[12px] font-medium text-[#8c2d22]">
                    {String(createState.error)}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--border-light)] px-5 py-4">
                <button
                  type="button"
                  className="cursor-pointer rounded-lg border-[1.5px] border-[var(--border)] bg-white px-4 py-2 text-[12.5px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] disabled:opacity-50"
                  disabled={createPending}
                  onClick={() => setNewOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-lg border-[1.5px] border-[var(--green)] bg-[var(--green)] px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-[var(--green-dark)] disabled:opacity-60"
                  disabled={createPending}
                >
                  {createPending ? "Saving…" : "Create task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
