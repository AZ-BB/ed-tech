"use client";

import { deleteAdminStudentStory } from "@/actions/admin-student-stories";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { AdminStudentStoryTableRow } from "../_lib/fetch-admin-student-stories-page";
import type { AdminStudentStoryTopicRow } from "../_lib/fetch-admin-student-story-topics";
import { AdminEditStudentStoryDialog } from "./admin-edit-student-story-dialog";

type AdminStudentStoriesTableClientProps = {
  rows: AdminStudentStoryTableRow[];
  topics: AdminStudentStoryTopicRow[];
};

export function AdminStudentStoriesTableClient({
  rows,
  topics,
}: AdminStudentStoriesTableClientProps) {
  const router = useRouter();
  const [editRow, setEditRow] = useState<AdminStudentStoryTableRow | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(row: AdminStudentStoryTableRow) {
    if (!window.confirm(`Delete story "${row.title}"? This cannot be undone.`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteAdminStudentStory(row.id);
      if (!result.ok) {
        window.alert(result.error ?? "Could not delete story.");
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
            <h2 className="text-[14px] font-bold text-[#1a1a1a]">Stories</h2>
            <span className="text-[11px] text-[#a0a0a0]">
              {rows.length.toLocaleString()} {rows.length === 1 ? "story" : "stories"}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#ece9e4] bg-[#faf9f7] text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">Topic</th>
                <th className="px-5 py-3">Ambassador</th>
                <th className="px-5 py-3">Duration</th>
                <th className="px-5 py-3">Lead</th>
                <th className="px-5 py-3">Active</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-[13px] text-[#a0a0a0]">
                    No stories yet. Use Add Story to create one.
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
                    <td className="whitespace-nowrap px-5 py-3">{row.topicName}</td>
                    <td className="whitespace-nowrap px-5 py-3">{row.ambassadorName}</td>
                    <td className="whitespace-nowrap px-5 py-3">{row.durationLabel ?? "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3">{row.isLead ? "Yes" : "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3">{row.isActive ? "Yes" : "No"}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
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

      <AdminEditStudentStoryDialog
        open={editRow !== null}
        onClose={() => setEditRow(null)}
        row={editRow}
        topics={topics}
      />
    </>
  );
}
