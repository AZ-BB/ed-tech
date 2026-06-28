"use client";

import { ADMIN_WEBINARS_HOME } from "@/app/(protected)/admin/content/_data/content-tabs-data";
import { format } from "date-fns";
import Link from "next/link";
import { useState } from "react";

import { WebinarTags } from "@/app/(protected)/student/webinars/_components/webinar-tag-badge";
import type { AdminWebinarEnrollmentRow } from "../_lib/fetch-admin-webinar-detail";
import type { AdminWebinarTableRow } from "../_lib/fetch-admin-webinars-page";
import { AdminEditWebinarDialog } from "./admin-edit-webinar-dialog";
import { AdminStartWebinarSessionDialog } from "./admin-start-webinar-session-dialog";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "MMM d, yyyy h:mm a");
}

type AdminWebinarDetailClientProps = {
  webinar: AdminWebinarTableRow;
  enrollments: AdminWebinarEnrollmentRow[];
};

export function AdminWebinarDetailClient({
  webinar,
  enrollments,
}: AdminWebinarDetailClientProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);

  return (
    <>
      <div className="mb-4">
        <Link
          href={ADMIN_WEBINARS_HOME}
          className="text-[12px] font-semibold text-[#2D6A4F] hover:text-[#1B4332]"
        >
          ← Back to webinars
        </Link>
      </div>

      <div className="mb-6 overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ece9e4] px-5 py-4">
          <div>
            <h1 className="text-[18px] font-bold text-[#1a1a1a]">{webinar.title}</h1>
            <p className="mt-1 text-[12px] text-[#a0a0a0] capitalize">Status: {webinar.status}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a] hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setStartOpen(true)}
              className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#1B4332]"
            >
              Start session
            </button>
          </div>
        </div>

        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
              Advisor
            </p>
            <p className="text-[13px] text-[#1a1a1a]">{webinar.advisorName}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
              Scheduled
            </p>
            <p className="text-[13px] text-[#1a1a1a]">
              {formatDateTime(webinar.scheduledAt)} {webinar.timezoneLabel}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
              Registrations
            </p>
            <p className="text-[13px] text-[#1a1a1a]">
              {webinar.registeredCount} / {webinar.maxStudents}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
              Meeting link
            </p>
            <p className="text-[13px] text-[#1a1a1a] break-all">
              {webinar.meetingLink ? (
                <a href={webinar.meetingLink} className="text-[#2D6A4F] hover:underline">
                  {webinar.meetingLink}
                </a>
              ) : (
                "—"
              )}
            </p>
          </div>
        </div>

        {webinar.description ? (
          <div className="border-t border-[#ece9e4] px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
              Description
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#4a4a4a]">{webinar.description}</p>
          </div>
        ) : null}

        {webinar.tags.length > 0 ? (
          <div className="border-t border-[#ece9e4] px-5 py-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
              Tags
            </p>
            <WebinarTags tags={webinar.tags} />
          </div>
        ) : null}

        {webinar.agenda.length > 0 ? (
          <div className="border-t border-[#ece9e4] px-5 py-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
              Agenda
            </p>
            <ul className="list-disc space-y-1 pl-5 text-[13px] text-[#4a4a4a]">
              {webinar.agenda.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white">
        <div className="border-b border-[#ece9e4] px-5 py-4">
          <h2 className="text-[14px] font-bold text-[#1a1a1a]">Enrolled students</h2>
          <p className="text-[11px] text-[#a0a0a0]">
            {enrollments.length.toLocaleString()}{" "}
            {enrollments.length === 1 ? "student" : "students"}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#ece9e4] bg-[#faf9f7] text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">School</th>
                <th className="px-5 py-3">Registered</th>
                <th className="px-5 py-3">Reminder sent</th>
                <th className="px-5 py-3">Link sent</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-[13px] text-[#a0a0a0]">
                    No students enrolled yet.
                  </td>
                </tr>
              ) : (
                enrollments.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#ece9e4] text-[13px] text-[#4a4a4a] last:border-b-0"
                  >
                    <td className="px-5 py-3 font-medium text-[#1a1a1a]">{row.studentName}</td>
                    <td className="px-5 py-3">{row.email}</td>
                    <td className="px-5 py-3">{row.schoolName}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-[12px]">
                      {formatDateTime(row.registeredAt)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-[12px]">
                      {formatDateTime(row.reminderSentAt)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-[12px]">
                      {formatDateTime(row.meetingLinkSentAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminEditWebinarDialog open={editOpen} onClose={() => setEditOpen(false)} row={webinar} />

      <AdminStartWebinarSessionDialog
        open={startOpen}
        onClose={() => setStartOpen(false)}
        webinarId={webinar.id}
        webinarTitle={webinar.title}
      />
    </>
  );
}
