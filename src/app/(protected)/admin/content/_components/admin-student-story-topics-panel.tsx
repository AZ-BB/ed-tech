"use client";

import { deleteAdminStudentStoryTopic } from "@/actions/admin-student-stories";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { AdminStudentStoryTopicRow } from "../_lib/fetch-admin-student-story-topics";
import { AdminAddStudentStoryTopicDialog } from "./admin-add-student-story-topic-dialog";
import { AdminEditStudentStoryTopicDialog } from "./admin-edit-student-story-topic-dialog";

type AdminStudentStoryTopicsPanelProps = {
  topics: AdminStudentStoryTopicRow[];
};

export function AdminStudentStoryTopicsPanel({
  topics,
}: AdminStudentStoryTopicsPanelProps) {
  const router = useRouter();
  const [editRow, setEditRow] = useState<AdminStudentStoryTopicRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete(row: AdminStudentStoryTopicRow) {
    if (!window.confirm(`Delete topic "${row.name}"? This cannot be undone.`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteAdminStudentStoryTopic(row.id);
      if (!result.ok) {
        window.alert(result.error ?? "Could not delete topic.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <div className="mb-6 overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-[#ece9e4] px-5 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="text-[14px] font-bold text-[#1a1a1a]">Topics</h2>
            <span className="text-[11px] text-[#a0a0a0]">
              {topics.length.toLocaleString()} {topics.length === 1 ? "topic" : "topics"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#4a4a4a] transition-colors hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
          >
            Add Topic
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#ece9e4] bg-[#faf9f7] text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Sort</th>
                <th className="px-5 py-3">Stories</th>
                <th className="px-5 py-3">Active</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {topics.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-[13px] text-[#a0a0a0]">
                    No topics yet.
                  </td>
                </tr>
              ) : (
                topics.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#ece9e4] text-[13px] text-[#4a4a4a] last:border-b-0"
                  >
                    <td className="px-5 py-3 font-medium text-[#1a1a1a]">{row.name}</td>
                    <td className="whitespace-nowrap px-5 py-3">{row.sortOrder}</td>
                    <td className="whitespace-nowrap px-5 py-3">{row.storyCount}</td>
                    <td className="whitespace-nowrap px-5 py-3">
                      {row.isActive ? "Yes" : "No"}
                    </td>
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

      <AdminEditStudentStoryTopicDialog
        open={editRow !== null}
        onClose={() => setEditRow(null)}
        row={editRow}
      />
      <AdminAddStudentStoryTopicDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
