"use client";

import { updateAdvisorSessionStatus } from "@/actions/advisor-sessions";
import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";
import {
  ADMIN_ADVISOR_SESSION_STATUS_OPTIONS,
  ADMIN_SESSION_STATUS_LABEL,
  adminSessionStatusPillClass,
  advisorSessionStatusSelectClass,
} from "@/app/(protected)/admin/sessions/_lib/session-status-labels";
import {
  getMeetingTiming,
  meetingTimingClass,
  meetingTimingLabel,
} from "@/lib/meeting-overdue";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import type { AdvisorSessionDetailPayload } from "../_lib/fetch-advisor-session-detail";

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function SnapItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
        {label}
      </div>
      <div className="mt-1 whitespace-pre-wrap text-[13px] font-medium text-[var(--text)]">
        {value || "—"}
      </div>
    </div>
  );
}

export type AdvisorSessionViewClientProps = {
  payload: AdvisorSessionDetailPayload;
};

export function AdvisorSessionViewClient({ payload }: AdvisorSessionViewClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState(payload.status);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { student, school } = payload;
  const meetingTiming = getMeetingTiming(payload.bookedAt);
  const statusLabel = ADMIN_SESSION_STATUS_LABEL[status] ?? status.replace(/_/g, " ");

  useEffect(() => {
    setStatus(payload.status);
  }, [payload.status]);

  function handleStatusChange(nextStatus: string) {
    setActionError(null);
    const previous = status;
    setStatus(nextStatus);

    startTransition(async () => {
      const result = await updateAdvisorSessionStatus(String(payload.id), nextStatus);
      if (!result.ok) {
        setStatus(previous);
        setActionError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="w-full">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/advisor/sessions-and-calls"
          className="sd-back inline-flex cursor-pointer items-center gap-1.5 py-1.5 text-[12.5px] font-medium text-[var(--text-mid)] hover:text-[var(--green)] [&_svg]:h-[13px] [&_svg]:w-[13px]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to sessions and calls
        </Link>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <label htmlFor="advisor-session-status" className="sr-only">
            Session status
          </label>
          <select
            id="advisor-session-status"
            value={status}
            disabled={isPending}
            onChange={(event) => handleStatusChange(event.target.value)}
            className={advisorSessionStatusSelectClass(status, "header")}
            style={{ backgroundImage: SELECT_CHEVRON }}
            aria-label="Session status"
          >
            {ADMIN_ADVISOR_SESSION_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {actionError ? (
        <p className="mb-4 rounded-[8px] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]">
          {actionError}
        </p>
      ) : null}

      <div className="mb-5 flex flex-wrap items-start gap-4 rounded-[12px] border border-[#ece9e4] bg-white p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E8F5EE] text-[14px] font-bold text-[#2D6A4F]">
          S
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[18px] font-bold text-[#1a1a1a]">
              Advisor session #{payload.id}
            </h1>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${adminSessionStatusPillClass(status)}`}
            >
              {statusLabel}
            </span>
            {meetingTiming ? (
              <span className={meetingTimingClass(meetingTiming)}>
                {meetingTimingLabel(meetingTiming)}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[13px] text-[#6a6a6a]">
            {payload.studentName}
            {school ? ` · ${school.name}` : ""}
          </p>
          <p className="mt-0.5 text-[12px] text-[#a0a0a0]">
            Booked for {formatDateTime(payload.bookedAt)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <SchoolStudentPanel head="Session details" sub="Advisor booking information">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SnapItem label="Destination" value={payload.destinationLabel} />
            <SnapItem label="Current stage" value={payload.currentStage} />
            <SnapItem label="Booked at" value={formatDateTime(payload.bookedAt)} />
            <SnapItem label="Created" value={formatDateTime(payload.createdAt)} />
            <SnapItem label="Updated" value={formatDateTime(payload.updatedAt)} />
            <SnapItem
              label="Contact on session"
              value={[payload.studentName, payload.studentEmail, payload.studentPhone]
                .filter(Boolean)
                .join(" · ")}
            />
            <SnapItem label="Specific universities" value={payload.specificUni ?? "—"} />
            <SnapItem label="Help with" value={payload.helpWith ?? "—"} />
          </div>
        </SchoolStudentPanel>

        <SchoolStudentPanel head="Student" sub="Linked student account">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SnapItem label="Name" value={student.fullName} />
            <SnapItem label="Email" value={student.email} />
            <SnapItem label="Phone" value={student.phone ?? "—"} />
            <SnapItem label="Grade" value={student.grade ?? "—"} />
          </div>
        </SchoolStudentPanel>

        <SchoolStudentPanel head="School" sub="Student's school">
          {school ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SnapItem label="Name" value={school.name} />
              <SnapItem
                label="Location"
                value={[school.code, school.city, school.countryLabel]
                  .filter(Boolean)
                  .join(" · ")}
              />
            </div>
          ) : (
            <p className="text-[13px] text-[var(--text-light)]">
              No school linked to this student.
            </p>
          )}
        </SchoolStudentPanel>
      </div>
    </div>
  );
}
