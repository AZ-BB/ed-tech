"use client";

import {
  deleteAdminLesson,
  getAdminLessonDownloadUrl,
} from "@/actions/admin-lessons";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { AdminLessonTableRow } from "../_lib/fetch-admin-lessons-page";
import { AdminAddLessonDialog } from "./admin-add-lesson-dialog";
import { AdminEditLessonDialog } from "./admin-edit-lesson-dialog";

function formatTableDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "MMM d, yyyy");
}

function formatFileSize(bytes: number | null): string {
  if (bytes == null || bytes < 1) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

type AdminLessonsTableClientProps = {
  rows: AdminLessonTableRow[];
};

export function AdminLessonsTableClient({ rows }: AdminLessonsTableClientProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<AdminLessonTableRow | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(row: AdminLessonTableRow) {
    if (!window.confirm(`Delete "${row.title}"? This cannot be undone.`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteAdminLesson(row.id);
      if (!result.ok) {
        window.alert(result.error ?? "Could not delete lesson document.");
        return;
      }
      router.refresh();
    });
  }

  function handleDownload(row: AdminLessonTableRow) {
    startTransition(async () => {
      const result = await getAdminLessonDownloadUrl(row.id);
      if ("error" in result) {
        window.alert(result.error);
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <>
      <div className="overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-[#ece9e4] px-5 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="text-[14px] font-bold text-[#1a1a1a]">Lessons</h2>
            <span className="text-[11px] text-[#a0a0a0]">
              {rows.length.toLocaleString()} {rows.length === 1 ? "document" : "documents"}
            </span>
          </div>
          <button
            type="button"
            className="cursor-pointer rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-[7px] text-[12px] font-semibold text-white transition-colors hover:bg-[#1B4332]"
            onClick={() => setAddOpen(true)}
          >
            Add Document
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#ece9e4] bg-[#faf9f7] text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3">File</th>
                <th className="px-5 py-3">Uploaded</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-[13px] text-[#a0a0a0]">
                    No lesson documents yet. Use Add Document to upload one.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#ece9e4] text-[13px] text-[#4a4a4a] last:border-b-0"
                  >
                    <td className="max-w-[180px] px-5 py-3 font-medium text-[#1a1a1a]">
                      <span className="line-clamp-2">{row.title}</span>
                    </td>
                    <td className="max-w-[240px] px-5 py-3">
                      <span className="line-clamp-2">
                        {row.description ? truncate(row.description, 120) : "—"}
                      </span>
                    </td>
                    <td className="max-w-[160px] px-5 py-3">
                      <span className="line-clamp-1">{row.fileName}</span>
                      <span className="mt-0.5 block text-[11px] text-[#a0a0a0]">
                        {formatFileSize(row.fileSize)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-[12px]">
                      {formatTableDate(row.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDownload(row)}
                          className="cursor-pointer rounded-[6px] border border-[#e0deda] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#4a4a4a] transition-colors hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:opacity-60"
                        >
                          Download
                        </button>
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

      <AdminAddLessonDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <AdminEditLessonDialog
        open={editRow !== null}
        onClose={() => setEditRow(null)}
        row={editRow}
      />
    </>
  );
}
