"use client";

import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";
import {
  APPLICATION_CALL_OUTCOME_LABEL,
  APPLICATION_CALL_STATUSES,
  APPLICATION_CALL_STATUS_LABEL,
  APPLICATION_CALL_TYPE_LABEL,
  type ApplicationCallStatus,
} from "@/lib/application-call-constants";
import type { ApplicationCallRow } from "@/lib/fetch-application-calls";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  LogApplicationCallDialog,
  callToFormData,
  type LogApplicationCallFormData,
} from "@/components/application-support/log-application-call-dialog";

export type ApplicationCallsActions = {
  logCall: (input: {
    applicationId: string;
    callType: string;
    durationMinutes: number;
    callDate: string;
    status: string;
    outcome: string | null;
    summary: string | null;
    createFollowUpTask: boolean;
    followUpTaskTitle: string | null;
    followUpTaskDueDate: string | null;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  updateCall: (input: {
    callId: string;
    callType: string;
    durationMinutes: number;
    callDate: string;
    status: string;
    outcome: string | null;
    summary: string | null;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  updateCallStatus: (
    callId: string,
    status: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  deleteCall: (callId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
};

type ApplicationCallsTabProps = {
  applicationId: number;
  studentName: string;
  calls: ApplicationCallRow[];
  actions: ApplicationCallsActions;
};

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

const statusSelectClass =
  "min-w-[130px] cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_8px_center] bg-no-repeat py-1.5 pl-2.5 pr-8 text-[12px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C] disabled:cursor-not-allowed disabled:opacity-60";

function formatCallDate(isoDate: string): string {
  try {
    return new Date(`${isoDate}T12:00:00`).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

export function ApplicationCallsTab({
  applicationId,
  studentName,
  calls,
  actions,
}: ApplicationCallsTabProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCall, setEditingCall] = useState<ApplicationCallRow | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const editForm = useMemo(
    () => (editingCall ? callToFormData(editingCall) : null),
    [editingCall],
  );

  function handleLogCall(form: LogApplicationCallFormData) {
    setCreateError(null);
    const durationMinutes = Number.parseInt(form.durationMinutes.trim(), 10);

    startTransition(async () => {
      const result = await actions.logCall({
        applicationId: String(applicationId),
        callType: form.callType,
        durationMinutes,
        callDate: form.callDate,
        status: form.status,
        outcome: form.outcome || null,
        summary: form.summary.trim() || null,
        createFollowUpTask: form.createFollowUpTask,
        followUpTaskTitle: form.createFollowUpTask
          ? form.followUpTaskTitle.trim() || null
          : null,
        followUpTaskDueDate: form.createFollowUpTask
          ? form.followUpTaskDueDate.trim() || null
          : null,
      });

      if (!result.ok) {
        setCreateError(result.error);
        return;
      }
      setCreateOpen(false);
      router.refresh();
    });
  }

  function handleEditCall(form: LogApplicationCallFormData) {
    if (!editingCall) return;
    setEditError(null);
    const durationMinutes = Number.parseInt(form.durationMinutes.trim(), 10);

    startTransition(async () => {
      const result = await actions.updateCall({
        callId: editingCall.id,
        callType: form.callType,
        durationMinutes,
        callDate: form.callDate,
        status: form.status,
        outcome: form.outcome || null,
        summary: form.summary.trim() || null,
      });

      if (!result.ok) {
        setEditError(result.error);
        return;
      }
      setEditingCall(null);
      router.refresh();
    });
  }

  function handleStatusChange(callId: string, status: ApplicationCallStatus) {
    setListError(null);
    startTransition(async () => {
      const result = await actions.updateCallStatus(callId, status);
      if (!result.ok) {
        setListError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete(call: ApplicationCallRow) {
    const label = APPLICATION_CALL_TYPE_LABEL[call.callType];
    if (
      !window.confirm(
        `Delete this ${label} call from ${formatCallDate(call.callDate)}? This cannot be undone.`,
      )
    ) {
      return;
    }

    setListError(null);
    startTransition(async () => {
      const result = await actions.deleteCall(call.id);
      if (!result.ok) {
        setListError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <SchoolStudentPanel
        head="Call history"
        sub="Calls logged by admins and advisors for this application"
        actions={
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setCreateError(null);
              setCreateOpen(true);
            }}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-3 py-1.5 text-[11.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-[13px] w-[13px]">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Log a call
          </button>
        }
      >
        {listError ? (
          <p className="mb-3 text-[12px] font-medium text-[#8c2d22]">{listError}</p>
        ) : null}

        {calls.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-[var(--text-light)]">
            No calls logged yet — log the first one above.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--border-light)]">
            <table className="w-full min-w-[800px] border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => (
                  <tr
                    key={call.id}
                    className="border-t border-[var(--border-light)] hover:bg-[#faf9f4]"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text)]">
                      {formatCallDate(call.callDate)}
                    </td>
                    <td className="px-4 py-3 text-[var(--text)]">
                      {APPLICATION_CALL_TYPE_LABEL[call.callType]}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text-mid)]">
                      {call.durationMinutes} min
                    </td>
                    <td className="px-4 py-3 text-[var(--text-mid)]">
                      {call.outcome
                        ? APPLICATION_CALL_OUTCOME_LABEL[call.outcome]
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <label htmlFor={`call-status-${call.id}`} className="sr-only">
                        Status for {APPLICATION_CALL_TYPE_LABEL[call.callType]}
                      </label>
                      <select
                        id={`call-status-${call.id}`}
                        value={call.status}
                        disabled={isPending}
                        onChange={(event) =>
                          handleStatusChange(
                            call.id,
                            event.target.value as ApplicationCallStatus,
                          )
                        }
                        className={statusSelectClass}
                        style={{ backgroundImage: SELECT_CHEVRON }}
                        aria-label="Call status"
                      >
                        {APPLICATION_CALL_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {APPLICATION_CALL_STATUS_LABEL[status]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            setEditError(null);
                            setEditingCall(call);
                          }}
                          className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[var(--green-light)] hover:text-[var(--green-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDelete(call)}
                          className="cursor-pointer rounded-[8px] border border-[#f0c4c4] bg-[#FCEBEB] px-2.5 py-1 text-[11.5px] font-semibold text-[#8c2d22] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SchoolStudentPanel>

      <LogApplicationCallDialog
        open={createOpen}
        mode="create"
        studentName={studentName}
        onClose={() => {
          if (!isPending) setCreateOpen(false);
        }}
        onSubmit={handleLogCall}
        isSubmitting={isPending}
        error={createError}
      />

      <LogApplicationCallDialog
        open={editingCall != null}
        mode="edit"
        studentName={studentName}
        initialForm={editForm}
        onClose={() => {
          if (!isPending) setEditingCall(null);
        }}
        onSubmit={handleEditCall}
        isSubmitting={isPending}
        error={editError}
      />
    </>
  );
}
