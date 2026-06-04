"use client";

import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";
import Link from "next/link";
import { useState } from "react";

import { AdminConfirmAmbassadorPickerDialog } from "./admin-confirm-ambassador-picker-dialog";

import {
  ADMIN_AMBASSADOR_SPECIFIC_REQUESTS_HOME,
} from "../../../_data/sessions-tabs-data";
import {
  adminSessionStatusPillClass,
} from "../../../_lib/session-status-labels";
import type { AdminAmbassadorSpecificRequestDetailPayload } from "../_lib/fetch-admin-ambassador-specific-request-detail";

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

export type AdminAmbassadorSpecificRequestViewClientProps = {
  payload: AdminAmbassadorSpecificRequestDetailPayload;
};

export function AdminAmbassadorSpecificRequestViewClient({
  payload,
}: AdminAmbassadorSpecificRequestViewClientProps) {
  const { request, student, school } = payload;
  const statusLabel = request.status.replace(/_/g, " ");
  const isPending = request.status === "pending";
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="w-full">
      <div className="mb-3.5">
        <Link
          href={ADMIN_AMBASSADOR_SPECIFIC_REQUESTS_HOME}
          className="sd-back inline-flex cursor-pointer items-center gap-1.5 py-1.5 text-[12.5px] font-medium text-[var(--text-mid)] hover:text-[var(--green)] [&_svg]:h-[13px] [&_svg]:w-[13px]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to ambassador requests
        </Link>
      </div>

      <div className="mb-5 flex flex-wrap items-start gap-4 rounded-[12px] border border-[#ece9e4] bg-white p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E8F5EE] text-[14px] font-bold text-[#2D6A4F]">
          AR
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[18px] font-bold text-[#1a1a1a]">
              Ambassador request #{request.id}
            </h1>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${adminSessionStatusPillClass(request.status)}`}
            >
              {statusLabel}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-[#6a6a6a]">
            {request.studentName}
            {school ? ` · ${school.name}` : ""}
          </p>
          <p className="mt-0.5 text-[12px] text-[#a0a0a0]">
            Looking for: {request.targetUniversity}
          </p>
          {isPending ? (
            <button
              type="button"
              className="mt-3 rounded-[8px] bg-[#2d6a4f] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#245a42]"
              onClick={() => setConfirmOpen(true)}
            >
              Confirm ambassador &amp; notify student
            </button>
          ) : null}
        </div>
      </div>

      <AdminConfirmAmbassadorPickerDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        requestId={request.id}
      />

      <div className="flex flex-col gap-4">
        <SchoolStudentPanel
          head="Request details"
          sub="Information submitted by the student"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SnapItem label="Full name" value={request.studentName} />
            <SnapItem label="Email" value={request.studentEmail} />
            <SnapItem label="Phone" value={request.studentPhone} />
            <SnapItem
              label="University / ambassador sought"
              value={request.targetUniversity}
            />
            <SnapItem
              label="Preferred major / area of study"
              value={request.preferredMajor ?? "—"}
            />
            <SnapItem label="Status" value={statusLabel} />
            <SnapItem label="Submitted" value={formatDateTime(request.createdAt)} />
            <SnapItem label="Last updated" value={formatDateTime(request.updatedAt)} />
          </div>
          {request.additionalNotes ? (
            <div className="mt-3">
              <SnapItem label="Additional notes" value={request.additionalNotes} />
            </div>
          ) : null}
        </SchoolStudentPanel>

        {request.assignedAmbassador ? (
          <SchoolStudentPanel
            head="Assigned ambassador"
            sub="Confirmed match sent to the student"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailLink
                href={request.assignedAmbassador.href}
                label={request.assignedAmbassador.fullName}
                sub={request.assignedAmbassador.email}
              />
              <SnapItem
                label="University"
                value={request.assignedAmbassador.university}
              />
              <SnapItem
                label="Major"
                value={request.assignedAmbassador.major ?? "—"}
              />
              <SnapItem
                label="Destination"
                value={request.assignedAmbassador.destinationLabel}
              />
              <SnapItem
                label="Catalog status"
                value={
                  request.assignedAmbassador.isActive ? "Active" : "Inactive"
                }
              />
            </div>
          </SchoolStudentPanel>
        ) : null}

        {student ? (
          <SchoolStudentPanel head="Student" sub="Linked student account">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailLink
                href={student.href}
                label={student.fullName}
                sub={student.email}
              />
              <SnapItem label="Phone" value={student.phone ?? "—"} />
              <SnapItem label="Grade" value={student.grade ?? "—"} />
              <SnapItem label="Contact on request" value={request.studentEmail} />
            </div>
          </SchoolStudentPanel>
        ) : null}

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
    </div>
  );
}
