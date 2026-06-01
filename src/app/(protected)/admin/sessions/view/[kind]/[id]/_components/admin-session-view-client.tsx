"use client";

import { updateAdminSessionStatus } from "@/actions/admin-sessions";
import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";
import {
  ADMIN_ADVISOR_SESSION_STATUS_OPTIONS,
  ADMIN_AMBASSADOR_SESSION_STATUS_OPTIONS,
  ADMIN_SESSION_STATUS_LABEL,
  adminSessionStatusPillClass,
  sessionKindLabel,
} from "@/app/(protected)/admin/sessions/_lib/session-status-labels";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import type { AdminSessionDetailPayload } from "../../../../_lib/fetch-admin-session-detail";
import { AdminEditSessionDialog } from "./admin-edit-session-dialog";

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

const headerSelectClass =
  "min-w-[140px] cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_8px_center] bg-no-repeat py-[7px] pl-[10px] pr-9 text-[12px] text-[#4a4a4a] outline-none transition-colors focus:border-[#40916C] disabled:cursor-not-allowed disabled:opacity-60";

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

function DetailLink({
  href,
  label,
  sub,
}: {
  href: string;
  label: string;
  sub?: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-3 transition-colors hover:border-[var(--green-light)] hover:bg-[#f0f7f2]"
    >
      <div className="text-[13px] font-semibold text-[var(--green-dark)]">{label}</div>
      {sub ? (
        <div className="mt-0.5 text-[12px] text-[var(--text-mid)]">{sub}</div>
      ) : null}
    </Link>
  );
}

export type AdminSessionViewClientProps = {
  payload: AdminSessionDetailPayload;
};

export function AdminSessionViewClient({ payload }: AdminSessionViewClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState(payload.session.status);
  const [editOpen, setEditOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { session, provider, student, school } = payload;
  const isAdvisor = session.kind === "advisor";

  useEffect(() => {
    setStatus(payload.session.status);
  }, [payload.session.status]);

  const statusOptions = isAdvisor
    ? ADMIN_ADVISOR_SESSION_STATUS_OPTIONS
    : ADMIN_AMBASSADOR_SESSION_STATUS_OPTIONS;

  const statusLabel =
    ADMIN_SESSION_STATUS_LABEL[status] ?? status.replace(/_/g, " ");

  function handleStatusChange(nextStatus: string) {
    setActionError(null);
    const previous = status;
    setStatus(nextStatus);

    startTransition(async () => {
      const result = await updateAdminSessionStatus(
        session.kind,
        String(session.id),
        nextStatus,
      );
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
          href="/admin/sessions"
          className="sd-back inline-flex cursor-pointer items-center gap-1.5 py-1.5 text-[12.5px] font-medium text-[var(--text-mid)] hover:text-[var(--green)] [&_svg]:h-[13px] [&_svg]:w-[13px]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to sessions
        </Link>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <label htmlFor="session-status" className="sr-only">
            Session status
          </label>
          <select
            id="session-status"
            value={status}
            disabled={isPending}
            onChange={(event) => handleStatusChange(event.target.value)}
            className={headerSelectClass}
            style={{ backgroundImage: SELECT_CHEVRON }}
            aria-label="Session status"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="cursor-pointer rounded-[8px] border-[1.5px] border-[var(--green)] bg-white px-3.5 py-[7px] text-[12px] font-semibold text-[var(--green-dark)] transition-opacity hover:bg-[var(--green-bg)]"
          >
            Edit details
          </button>
        </div>
      </div>

      {actionError ? (
        <p className="mb-4 rounded-[8px] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]">
          {actionError}
        </p>
      ) : null}

      <div className="mb-5 flex flex-wrap items-start gap-4 rounded-[12px] border border-[#ece9e4] bg-white p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E8F5EE] text-[14px] font-bold text-[#2D6A4F]">
          {sessionKindLabel(session.kind).slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[18px] font-bold text-[#1a1a1a]">
              {sessionKindLabel(session.kind)} session #{session.id}
            </h1>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${adminSessionStatusPillClass(status)}`}
            >
              {statusLabel}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-[#6a6a6a]">
            {session.studentName}
            {school ? ` · ${school.name}` : ""}
          </p>
          <p className="mt-0.5 text-[12px] text-[#a0a0a0]">
            With {provider.fullName}
            {provider.title ? ` · ${provider.title}` : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <SchoolStudentPanel
          head="Session details"
          sub={
            isAdvisor
              ? "Advisor booking information"
              : "Ambassador session request information"
          }
        >
          {isAdvisor ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SnapItem label="Destination" value={session.destinationLabel} />
              <SnapItem label="Current stage" value={session.currentStage} />
              <SnapItem label="Booked at" value={formatDateTime(session.bookedAt)} />
              <SnapItem label="Created" value={formatDateTime(session.createdAt)} />
              <SnapItem label="Updated" value={formatDateTime(session.updatedAt)} />
              <SnapItem
                label="Contact on session"
                value={[session.studentName, session.studentEmail, session.studentPhone]
                  .filter(Boolean)
                  .join(" · ")}
              />
              <SnapItem label="Specific universities" value={session.specificUni ?? "—"} />
              <SnapItem label="Help with" value={session.helpWith ?? "—"} />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SnapItem label="Preferred time 1" value={formatDateTime(session.prefTime1)} />
              <SnapItem label="Preferred time 2" value={formatDateTime(session.prefTime2)} />
              <SnapItem label="Preferred time 3" value={formatDateTime(session.prefTime3)} />
              <SnapItem label="Requested" value={formatDateTime(session.createdAt)} />
              <SnapItem label="Updated" value={formatDateTime(session.updatedAt)} />
              <SnapItem
                label="Contact on session"
                value={[session.studentName, session.studentEmail, session.studentPhone]
                  .filter(Boolean)
                  .join(" · ")}
              />
              <div className="sm:col-span-2">
                <SnapItem label="Discussion topics" value={session.discussionTopics ?? "—"} />
              </div>
            </div>
          )}
        </SchoolStudentPanel>

        <SchoolStudentPanel
          head={isAdvisor ? "Advisor" : "Ambassador"}
          sub="Assigned provider for this session"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailLink
              href={provider.href}
              label={provider.fullName}
              sub={provider.title ?? provider.subtitle ?? undefined}
            />
            <SnapItem label="Email" value={provider.email} />
            <SnapItem label="Phone" value={provider.phone ?? "—"} />
            {provider.subtitle && !provider.title ? (
              <SnapItem label="Profile" value={provider.subtitle} />
            ) : null}
          </div>
        </SchoolStudentPanel>

        <SchoolStudentPanel head="Student" sub="Linked student account">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailLink href={student.href} label={student.fullName} sub={student.email} />
            <SnapItem label="Phone" value={student.phone ?? "—"} />
            <SnapItem label="Grade" value={student.grade ?? "—"} />
            <SnapItem
              label="Contact on session"
              value={session.studentEmail ?? student.email}
            />
          </div>
        </SchoolStudentPanel>

        <SchoolStudentPanel head="School" sub="Student's school">
          {school ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailLink
                href={school.href}
                label={school.name}
                sub={[school.code, school.city].filter(Boolean).join(" · ") || undefined}
              />
              <SnapItem label="Country" value={school.countryLabel} />
            </div>
          ) : (
            <p className="text-[13px] text-[var(--text-light)]">
              No school linked to this student.
            </p>
          )}
        </SchoolStudentPanel>
      </div>

      <AdminEditSessionDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        payload={payload}
      />
    </div>
  );
}
