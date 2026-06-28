"use client";

import {
  createAdvisorApplicationTask,
  toggleAdvisorApplicationTaskCompleted,
} from "@/actions/advisor-application-tasks";
import {
  AddAdvisorTaskDialog,
  type AddAdvisorTaskSubmitInput,
} from "@/app/(protected)/advisor/tasks/_components/add-advisor-task-dialog";
import type {
  AdvisorTasksPanelProps,
  AdvisorTaskStatusFilter,
} from "@/app/(protected)/advisor/tasks/_lib/fetch-advisor-tasks-page";
import { Pagination } from "@/components/pagination";
import {
  APPLICATION_TASK_PRIORITY_LABEL,
  applicationTaskPriorityPillClass,
  formatRelativeTaskDue,
  isApplicationTaskOverdue,
} from "@/lib/application-task-constants";
import { format } from "date-fns";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

const TASKS_LIMIT_OPTIONS = [10, 20, 50] as const;

const STATUS_OPTIONS: { value: AdvisorTaskStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "undone", label: "Undone" },
  { value: "done", label: "Done" },
];

function formatDueDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "d MMM yyyy");
  } catch {
    return "—";
  }
}

function TaskCheckbox({
  checked,
  disabled,
  onChange,
  title,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
  title: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={checked ? `Mark "${title}" undone` : `Mark "${title}" done`}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onChange(!checked);
      }}
      className={`flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center rounded-[5px] border-[1.5px] bg-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        checked
          ? "border-[var(--green-bright)] bg-[var(--green-bright)]"
          : "border-[var(--border)] hover:border-[var(--green-light)]"
      }`}
    >
      {checked ? (
        <svg
          className="h-2.5 w-2.5 text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          aria-hidden
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ) : null}
    </button>
  );
}

export function AdvisorTasksTable({
  rows,
  totalRows,
  page,
  limit,
  status,
  statusCounts,
  taskCreateOptions,
}: AdvisorTasksPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addTaskError, setAddTaskError] = useState<string | null>(null);

  const switchStatus = useCallback(
    (nextStatus: AdvisorTaskStatusFilter) => {
      if (nextStatus === status) return;
      startTransition(() => {
        const next = new URLSearchParams(searchParams.toString());
        if (nextStatus === "all") {
          next.delete("status");
        } else {
          next.set("status", nextStatus);
        }
        next.set("tasksPage", "1");
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams, status],
  );

  function handleToggleCompleted(taskId: string, completed: boolean) {
    setToggleError(null);
    startTransition(async () => {
      const result = await toggleAdvisorApplicationTaskCompleted(taskId, completed);
      if (!result.ok) {
        setToggleError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleAddTask(input: AddAdvisorTaskSubmitInput) {
    setAddTaskError(null);
    startTransition(async () => {
      const result = await createAdvisorApplicationTask(
        String(input.applicationId),
        input.title,
        input.dueDate,
        input.priority,
      );
      if (!result.ok) {
        setAddTaskError(result.error);
        return;
      }
      setAddTaskOpen(false);
      router.refresh();
    });
  }

  return (
    <div
      className={`overflow-hidden rounded-[14px] border border-[var(--border-light)] bg-white ${isPending ? "opacity-75" : ""}`}
      aria-busy={isPending}
    >
      <div className="flex flex-wrap items-center justify-end gap-3 border-b border-[var(--border-light)] px-4 py-3">
        <button
          type="button"
          onClick={() => {
            setAddTaskError(null);
            setAddTaskOpen(true);
          }}
          disabled={isPending || taskCreateOptions.length === 0}
          className="cursor-pointer rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-3.5 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add task
        </button>
      </div>
      <div className="flex flex-wrap gap-1 border-b border-[var(--border-light)] px-4 pt-3">
        {STATUS_OPTIONS.map((option) => {
          const active = option.value === status;
          const count = statusCounts[option.value];
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => switchStatus(option.value)}
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

      {toggleError ? (
        <div className="border-b border-[var(--border-light)] px-4 py-2">
          <span className="text-[12px] font-medium text-[#8c2d22]">{toggleError}</span>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] border-collapse text-[13px] table-fixed">
          <thead>
            <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
              <th className="w-12 px-4 py-3" aria-label="Done" />
              <th className="w-[42%] min-w-[300px] px-4 py-3">Task</th>
              <th className="w-[18%] px-4 py-3">Student</th>
              <th className="w-[8%] whitespace-nowrap px-4 py-3">Application</th>
              <th className="w-[14%] whitespace-nowrap px-4 py-3">Due date</th>
              <th className="w-[8%] whitespace-nowrap px-4 py-3">Priority</th>
              <th className="w-[10%] px-4 py-3">Author</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-[var(--text-light)]"
                >
                  {status === "undone"
                    ? "No undone tasks for your assigned applications."
                    : status === "done"
                      ? "No completed tasks yet."
                      : "No tasks yet for your assigned applications."}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const overdue = isApplicationTaskOverdue(row.dueDate, row.completed);
                const dueLabel = formatRelativeTaskDue(row.dueDate, row.completed);
                const detailHref = `/advisor/applications/${row.applicationId}?tab=tasks`;

                function openDetail() {
                  router.push(detailHref);
                }

                return (
                  <tr
                    key={row.id}
                    className={`cursor-pointer border-t border-[var(--border-light)] transition-colors hover:bg-[#faf9f4] ${
                      overdue ? "bg-[rgba(231,76,60,0.04)]" : ""
                    }`}
                    onClick={openDetail}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDetail();
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`View task ${row.title} for ${row.studentName}`}
                  >
                    <td className="px-4 py-3">
                      <TaskCheckbox
                        checked={row.completed}
                        disabled={isPending}
                        title={row.title}
                        onChange={(checked) =>
                          handleToggleCompleted(row.id, checked)
                        }
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div
                        className={`whitespace-normal break-words leading-snug font-semibold text-[var(--text)] ${
                          row.completed
                            ? "text-[var(--text-light)] line-through"
                            : ""
                        }`}
                      >
                        {row.title}
                      </div>
                      {overdue ? (
                        <span className="mt-0.5 inline-flex rounded-full bg-[rgba(231,76,60,0.12)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#8c2d22]">
                          Overdue
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5 text-[var(--text)]">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] text-[11.5px] font-bold text-[var(--green-dark)]">
                          {row.studentInitials}
                        </span>
                        <span className="font-medium">{row.studentName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--green-dark)]">
                      #{row.applicationId}
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className={
                          overdue
                            ? "font-semibold text-[var(--red)]"
                            : "text-[var(--text-mid)]"
                        }
                      >
                        {formatDueDate(row.dueDate)}
                      </div>
                      {dueLabel && !row.completed ? (
                        <div
                          className={`text-[11px] ${
                            overdue ? "font-medium text-[var(--red)]" : "text-[var(--text-hint)]"
                          }`}
                        >
                          {dueLabel}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${applicationTaskPriorityPillClass(row.priority)}`}
                      >
                        {APPLICATION_TASK_PRIORITY_LABEL[row.priority]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-light)]">
                      {row.authorName}
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
          limitOptions={TASKS_LIMIT_OPTIONS}
          pageParam="tasksPage"
          limitParam="tasksLimit"
        />
      </div>

      <AddAdvisorTaskDialog
        open={addTaskOpen}
        onClose={() => {
          if (!isPending) setAddTaskOpen(false);
        }}
        studentOptions={taskCreateOptions}
        onSubmit={handleAddTask}
        isSubmitting={isPending}
        error={addTaskError}
      />
    </div>
  );
}
