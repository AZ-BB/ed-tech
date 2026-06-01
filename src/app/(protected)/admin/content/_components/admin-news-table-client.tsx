"use client";

import { deleteAdminNewsItem } from "@/actions/admin-news";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { AdminNewsTableRow } from "../_lib/fetch-admin-news-page";
import { AdminEditNewsDialog } from "./admin-edit-news-dialog";

const newsTagClass = {
  visa: "bg-[#E6F1FB] text-[#185FA5]",
  deadline: "bg-[#FFF3E0] text-[#E65100]",
  update: "bg-[#e8f5ee] text-[#2D6A4F]",
} as const;

function newsTagLabel(tag: AdminNewsTableRow["tag"]): string {
  if (tag === "visa") return "Visa";
  if (tag === "deadline") return "Deadline";
  return "Update";
}

function formatTableDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "MMM d, yyyy");
}

type AdminNewsTableClientProps = {
  rows: AdminNewsTableRow[];
};

export function AdminNewsTableClient({ rows }: AdminNewsTableClientProps) {
  const router = useRouter();
  const [editRow, setEditRow] = useState<AdminNewsTableRow | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(row: AdminNewsTableRow) {
    if (!window.confirm(`Delete news item "${row.text}"? This cannot be undone.`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteAdminNewsItem(row.id);
      if (!result.ok) {
        window.alert(result.error ?? "Could not delete news item.");
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
            <h2 className="text-[14px] font-bold text-[#1a1a1a]">News & Updates</h2>
            <span className="text-[11px] text-[#a0a0a0]">
              {rows.length.toLocaleString()} {rows.length === 1 ? "entry" : "entries"}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#ece9e4] bg-[#faf9f7] text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
                <th className="px-5 py-3">Tag</th>
                <th className="px-5 py-3">Headline</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-[13px] text-[#a0a0a0]">
                    No news items yet. Use Add News Item to create one.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#ece9e4] text-[13px] text-[#4a4a4a] last:border-b-0"
                  >
                    <td className="whitespace-nowrap px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${newsTagClass[row.tag]}`}
                      >
                        {newsTagLabel(row.tag)}
                      </span>
                    </td>
                    <td className="max-w-[360px] px-5 py-3 font-medium text-[#1a1a1a]">
                      <span className="line-clamp-2">{row.text}</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-[12px]">
                      {formatTableDate(row.createdAt)}
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

      <AdminEditNewsDialog open={editRow !== null} onClose={() => setEditRow(null)} row={editRow} />
    </>
  );
}
