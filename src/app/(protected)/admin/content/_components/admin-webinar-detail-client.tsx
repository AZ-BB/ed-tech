"use client";

import { exportAdminWebinarAttendeesExcel, startAdminWebinarSession, toggleAdminWebinarFeatured } from "@/actions/admin-webinars";
import { triggerAdminWebinarAttendeesExcelDownload } from "@/app/(protected)/admin/content/_lib/admin-webinar-attendees-excel";
import { ADMIN_WEBINARS_HOME } from "@/app/(protected)/admin/content/_data/content-tabs-data";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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

function isActiveWebinarStatus(status: AdminWebinarTableRow["status"]) {
  return status === "upcoming" || status === "live";
}

type AdminWebinarDetailClientProps = {
  webinar: AdminWebinarTableRow;
  enrollments: AdminWebinarEnrollmentRow[];
};

export function AdminWebinarDetailClient({
  webinar,
  enrollments,
}: AdminWebinarDetailClientProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isExportPending, startExportTransition] = useTransition();

  function handleToggleFeatured() {
    startTransition(async () => {
      const result = await toggleAdminWebinarFeatured(webinar.id);
      if (!result.ok) {
        window.alert(result.error ?? "Could not update featured webinar.");
        return;
      }
      router.refresh();
    });
  }

  async function handleStartSession() {
    setStartError(null);

    if (!webinar.meetingLink) {
      setStartOpen(true);
      return;
    }

    setIsStarting(true);
    const result = await startAdminWebinarSession(webinar.id);

    if (!result.ok) {
      setStartError(result.error);
      setIsStarting(false);
      return;
    }

    if (result.emailErrors.length > 0) {
      window.alert(
        `Session started. Emails sent: ${result.emailsSent}. Some emails failed:\n${result.emailErrors.join("\n")}`,
      );
    }

    setIsStarting(false);
    router.refresh();
  }

  function handleExportAttendees() {
    startExportTransition(async () => {
      const result = await exportAdminWebinarAttendeesExcel(webinar.id);

      if (!result.ok) {
        window.alert(result.error);
        return;
      }

      if (result.rows.length === 0) {
        window.alert("No attendees to export.");
        return;
      }

      const day = new Date().toISOString().slice(0, 10);
      await triggerAdminWebinarAttendeesExcelDownload(
        result.rows,
        `webinar-${webinar.id}-attendees-${day}.xlsx`,
      );
    });
  }

  function registrationTypeLabel(type: AdminWebinarEnrollmentRow["registrationType"]) {
    return type === "platform" ? "Platform" : "Non-platform";
  }

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
            <p className="mt-1 text-[12px] text-[#a0a0a0] capitalize">
              Status: {webinar.status}
              {webinar.isFeatured ? (
                <span className="ml-2 rounded-full bg-[#f0f7f2] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#2D6A4F]">
                  Featured
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isActiveWebinarStatus(webinar.status) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={handleToggleFeatured}
                className={`cursor-pointer rounded-[8px] border px-4 py-2 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  webinar.isFeatured
                    ? "border-[#2D6A4F] bg-[#f0f7f2] text-[#2D6A4F]"
                    : "border-[#e0deda] bg-white text-[#4a4a4a] hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
                }`}
              >
                {webinar.isFeatured ? "Unfeature" : "Set featured"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a] hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
            >
              Edit
            </button>
            <button
              type="button"
              disabled={isStarting}
              onClick={() => void handleStartSession()}
              className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#1B4332] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isStarting ? "Starting…" : "Start session"}
            </button>
          </div>
        </div>

        {startError ? (
          <div className="border-b border-[#ece9e4] px-5 py-3">
            <p className="rounded-[8px] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]">
              {startError}
            </p>
          </div>
        ) : null}

        <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
              Host
            </p>
            <p className="text-[13px] text-[#1a1a1a]">{webinar.displayHostName}</p>
            {webinar.hostName ? (
              <>
                {webinar.hostTitle ? (
                  <p className="mt-1 text-[12px] text-[#7a7a7a]">{webinar.hostTitle}</p>
                ) : null}
                {webinar.hostBio ? (
                  <p className="mt-2 text-[12px] leading-relaxed text-[#4a4a4a]">{webinar.hostBio}</p>
                ) : null}
                {webinar.hostImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={webinar.hostImageUrl}
                    alt=""
                    className="mt-3 h-16 w-16 rounded-full object-cover"
                  />
                ) : null}
              </>
            ) : (
              <p className="mt-1 text-[12px] text-[#7a7a7a]">Linked advisor: {webinar.advisorName}</p>
            )}
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece9e4] px-5 py-4">
          <div>
            <h2 className="text-[14px] font-bold text-[#1a1a1a]">Attendees</h2>
            <p className="text-[11px] text-[#a0a0a0]">
              {enrollments.length.toLocaleString()}{" "}
              {enrollments.length === 1 ? "attendee" : "attendees"}
            </p>
          </div>
          <button
            type="button"
            disabled={isExportPending || enrollments.length === 0}
            onClick={() => handleExportAttendees()}
            className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a] transition-colors hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isExportPending ? "Exporting…" : "Export Excel"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#ece9e4] bg-[#faf9f7] text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">School</th>
                <th className="px-5 py-3">Registered</th>
                <th className="px-5 py-3">Reminder sent</th>
                <th className="px-5 py-3">Link sent</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-[13px] text-[#a0a0a0]">
                    No attendees yet.
                  </td>
                </tr>
              ) : (
                enrollments.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#ece9e4] text-[13px] text-[#4a4a4a] last:border-b-0"
                  >
                    <td className="px-5 py-3">{registrationTypeLabel(row.registrationType)}</td>
                    <td className="px-5 py-3 font-medium text-[#1a1a1a]">{row.name}</td>
                    <td className="px-5 py-3">{row.email}</td>
                    <td className="px-5 py-3">{row.phone ?? "—"}</td>
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
