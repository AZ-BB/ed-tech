"use client";

import { deleteAdminHandler } from "@/actions/admin-handlers";
import { AdminControl } from "@/app/(protected)/admin/_components/admin-control";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { AdminHandlerTableRow } from "../_lib/fetch-admin-handlers-page";
import { AdminEditHandlerDialog } from "./admin-edit-handler-dialog";

function formatTableDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "MMM d, yyyy");
}

type AdminHandlersTableClientProps = {
  rows: AdminHandlerTableRow[];
};

export function AdminHandlersTableClient({ rows }: AdminHandlersTableClientProps) {
  const router = useRouter();
  const [editRow, setEditRow] = useState<AdminHandlerTableRow | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(row: AdminHandlerTableRow) {
    const name = [row.firstName, row.lastName].filter(Boolean).join(" ").trim() || row.email;
    if (!window.confirm(`Delete handler "${name}"? Assigned applications will be unassigned.`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteAdminHandler(row.id);
      if (!result.ok) {
        window.alert(result.error ?? "Could not delete handler.");
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
            <h2 className="text-[14px] font-bold text-[#1a1a1a]">Handlers</h2>
            <span className="text-[11px] text-[#a0a0a0]">
              {rows.length.toLocaleString()} {rows.length === 1 ? "handler" : "handlers"}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#ece9e4] bg-[#faf9f7] text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Added</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-[13px] text-[#a0a0a0]">
                    No handlers yet. Use Add Handler to create one.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const name =
                    [row.firstName, row.lastName].filter(Boolean).join(" ").trim() || "—";
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-[#ece9e4] text-[13px] text-[#4a4a4a] last:border-b-0"
                    >
                      <td className="px-5 py-3 font-medium text-[#1a1a1a]">{name}</td>
                      <td className="px-5 py-3">{row.email || "—"}</td>
                      <td className="px-5 py-3">{row.phone || "—"}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                            row.isActive
                              ? "bg-[#e8f5ee] text-[#2D6A4F]"
                              : "bg-[#f3f2f0] text-[#a0a0a0]"
                          }`}
                        >
                          {row.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-[12px]">
                        {formatTableDate(row.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        <AdminControl permission="edit_applications">
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
                        </AdminControl>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminEditHandlerDialog
        open={editRow !== null}
        onClose={() => setEditRow(null)}
        row={editRow}
      />
    </>
  );
}
