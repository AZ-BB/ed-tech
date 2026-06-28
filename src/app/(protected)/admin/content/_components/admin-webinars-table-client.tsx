"use client";

import { deleteAdminWebinar } from "@/actions/admin-webinars";
import { ADMIN_WEBINARS_HOME } from "@/app/(protected)/admin/content/_data/content-tabs-data";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { AdminWebinarTableRow } from "../_lib/fetch-admin-webinars-page";
import { AdminEditWebinarDialog } from "./admin-edit-webinar-dialog";

function formatTableDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "MMM d, yyyy h:mm a");
}

type AdminWebinarsTableClientProps = {
  rows: AdminWebinarTableRow[];
};

export function AdminWebinarsTableClient({ rows }: AdminWebinarsTableClientProps) {
  const router = useRouter();
  const [editRow, setEditRow] = useState<AdminWebinarTableRow | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(row: AdminWebinarTableRow) {
    if (!window.confirm(`Delete webinar "${row.title}"? This cannot be undone.`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteAdminWebinar(row.id);
      if (!result.ok) {
        window.alert(result.error ?? "Could not delete webinar.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <div className="overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-[#ece9e4] px-5 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="text-[14px] font-bold text-[#1a1a1a]">Webinars</h2>
            <span className="text-[11px] text-[#a0a0a0]">
              {rows.length.toLocaleString()} {rows.length === 1 ? "entry" : "entries"}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#ece9e4] bg-[#faf9f7] text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">Advisor</th>
                <th className="px-5 py-3">Scheduled</th>
                <th className="px-5 py-3">Registrations</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-[13px] text-[#a0a0a0]">
                    No webinars yet. Use Add Webinar to create one.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#ece9e4] text-[13px] text-[#4a4a4a] last:border-b-0"
                  >
                    <td className="max-w-[220px] px-5 py-3 font-medium text-[#1a1a1a]">
                      <span className="line-clamp-2">{row.title}</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">{row.advisorName}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-[12px]">
                      {formatTableDate(row.scheduledAt)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      {row.registeredCount} / {row.maxStudents}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 capitalize">{row.status}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`${ADMIN_WEBINARS_HOME}/${row.id}`}
                          className="rounded-[6px] border border-[#e0deda] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#4a4a4a] transition-colors hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => setEditRow(row)}
                          className="cursor-pointer rounded-[6px] border border-[#e0deda] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#4a4a4a] transition-colors hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:opacity-60"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDelete(row)}
                          className="cursor-pointer rounded-[6px] border border-[#fecaca] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#b91c1c] transition-colors hover:bg-[#fef2f2] disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminEditWebinarDialog
        open={editRow !== null}
        onClose={() => setEditRow(null)}
        row={editRow}
      />
    </>
  );
}
