"use client";

import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";
import {
  APPLICATION_TASK_PRIORITIES,
  APPLICATION_TASK_PRIORITY_LABEL,
  formatApplicationTaskMeta,
  formatRelativeTaskDue,
  type ApplicationTaskPriority,
} from "@/lib/application-task-constants";
import type { ApplicationTaskRow } from "@/lib/fetch-application-tasks";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type ApplicationTasksActions = {
  createTask: (
    applicationId: string,
    title: string,
    dueDate: string | null,
    priority: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  toggleTaskCompleted: (
    taskId: string,
    completed: boolean,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
};

type ApplicationTasksTabProps = {
  applicationId: number;
  tasks: ApplicationTaskRow[];
  actions: ApplicationTasksActions;
};

const inputClassName =
  "w-full rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C] disabled:opacity-60";

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

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
      aria-label={`Mark "${title}" complete`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center rounded-[5px] border-[1.5px] bg-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
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

function ApplicationTaskRow({
  task,
  disabled,
  onToggle,
}: {
  task: ApplicationTaskRow;
  disabled: boolean;
  onToggle: (taskId: string, completed: boolean) => void;
}) {
  const dueLabel = formatRelativeTaskDue(task.dueDate, task.completed);
  const meta = formatApplicationTaskMeta(task.dueDate, task.priority, task.completed);
  const isOverdue = Boolean(
    dueLabel && (dueLabel.includes("overdue") || dueLabel.endsWith("overdue")),
  );

  return (
    <div
      className={`flex items-start gap-3 rounded-[10px] border border-[var(--border-light)] px-3.5 py-3 transition-colors ${
        task.completed ? "bg-[var(--cream)]" : "bg-white"
      }`}
    >
      <TaskCheckbox
        checked={task.completed}
        disabled={disabled}
        title={task.title}
        onChange={(checked) => onToggle(task.id, checked)}
      />
      <div className="min-w-0 flex-1">
        <div
          className={`text-[13.5px] font-semibold leading-snug text-[var(--text)] ${
            task.completed ? "text-[var(--text-light)] line-through" : ""
          }`}
        >
          {task.title}
        </div>
        {task.completed ? (
          <div className="mt-0.5 text-[12px] text-[var(--text-hint)]">Completed</div>
        ) : meta ? (
          <div className="mt-0.5 text-[12px] text-[var(--text-light)]">
            {dueLabel ? (
              <>
                <span className={isOverdue ? "font-medium text-[var(--red)]" : undefined}>
                  {dueLabel}
                </span>
                <span> · {APPLICATION_TASK_PRIORITY_LABEL[task.priority]} priority</span>
              </>
            ) : (
              meta
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ApplicationTasksTab({
  applicationId,
  tasks,
  actions,
}: ApplicationTasksTabProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<ApplicationTaskPriority>("medium");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreateTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await actions.createTask(
        String(applicationId),
        title,
        dueDate.trim() || null,
        priority,
      );

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setTitle("");
      setDueDate("");
      setPriority("medium");
      router.refresh();
    });
  }

  function handleToggleCompleted(taskId: string, completed: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await actions.toggleTaskCompleted(taskId, completed);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <SchoolStudentPanel
      head="Tasks"
      sub="Follow-ups and action items for this application"
    >
      <form
        onSubmit={handleCreateTask}
        className="mb-4 grid grid-cols-1 gap-3 rounded-[10px] border border-[var(--border-light)] bg-[rgb(250,249,244)] p-3.5 sm:grid-cols-[1fr_160px_140px_auto]"
      >
        <div>
          <label
            htmlFor="app-task-title"
            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]"
          >
            Task name
          </label>
          <input
            id="app-task-title"
            type="text"
            disabled={isPending}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Review personal statement draft"
            className={inputClassName}
          />
        </div>
        <div>
          <label
            htmlFor="app-task-due"
            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]"
          >
            Due date
          </label>
          <input
            id="app-task-due"
            type="date"
            disabled={isPending}
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label
            htmlFor="app-task-priority"
            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]"
          >
            Priority
          </label>
          <select
            id="app-task-priority"
            disabled={isPending}
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value as ApplicationTaskPriority)
            }
            className={`${inputClassName} cursor-pointer appearance-none bg-[length:10px_6px] bg-[position:right_10px_center] bg-no-repeat pr-9`}
            style={{ backgroundImage: SELECT_CHEVRON }}
          >
            {APPLICATION_TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {APPLICATION_TASK_PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={isPending || !title.trim()}
            className="w-full cursor-pointer rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-4 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isPending ? "Adding…" : "Add task"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="mb-3 text-[12px] font-medium text-[#8c2d22]">{error}</p>
      ) : null}

      {tasks.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-[var(--text-light)]">
          No tasks yet — add one above or create a follow-up from a call.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <ApplicationTaskRow
              key={task.id}
              task={task}
              disabled={isPending}
              onToggle={handleToggleCompleted}
            />
          ))}
        </div>
      )}
    </SchoolStudentPanel>
  );
}
