"use client";

import { Pagination } from "@/components/pagination";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { deleteAdminUniversityProgram } from "@/actions/admin-university-programs";

import type {
  AdminProgramDiscoveryOption,
  AdminUniversityProgramTableRow,
} from "../_lib/fetch-admin-university-programs-page";
import type { AdminUniversityProgramsStatusFilter } from "../_lib/parse-admin-university-programs-search-params";
import { AdminEditUniversityProgramDialog } from "./admin-edit-university-program-dialog";

const LIMIT_OPTIONS = [10, 20, 30, 50] as const;

const SELECT_CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237a7a7a' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")";

const filterSelectClass =
  "min-w-[160px] cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_8px_center] bg-no-repeat py-[7px] pl-[10px] pr-9 text-[12px] text-[#4a4a4a] outline-none transition-colors focus:border-[#40916C]";

export type AdminUniversityProgramsTableClientProps = {
  rows: AdminUniversityProgramTableRow[];
  totalRows: number;
  page: number;
  limit: number;
  q: string;
  programSlug: string;
  status: AdminUniversityProgramsStatusFilter;
  programOptions: AdminProgramDiscoveryOption[];
};

export function AdminUniversityProgramsTableClient({
  rows,
  totalRows,
  page,
  limit,
  q,
  programSlug,
  status,
  programOptions,
}: AdminUniversityProgramsTableClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [editRow, setEditRow] = useState<AdminUniversityProgramTableRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function updateParams(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = {
      q,
      program: programSlug,
      status,
      page: String(page),
      limit: String(limit),
      ...patch,
    };

    for (const [key, value] of Object.entries(merged)) {
      if (!value || (key === "status" && value === "all")) continue;
      params.set(key, value);
    }

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  async function handleDelete(id: string, label: string) {
    if (!window.confirm(`Delete link for ${label}?`)) return;
    setDeletingId(id);
    const result = await deleteAdminUniversityProgram(id);
    setDeletingId(null);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <div className="overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece9e4] px-5 py-4">
          <div>
            <h2 className="text-[14px] font-bold text-[#1a1a1a]">University Programs</h2>
            <p className="text-[11px] text-[#a0a0a0]">
              {totalRows.toLocaleString()} {totalRows === 1 ? "link" : "links"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              defaultValue={q}
              placeholder="Search university, program, notes…"
              className="min-w-[220px] rounded-[8px] border border-[#e0deda] px-3 py-[7px] text-[12px] outline-none focus:border-[#40916C]"
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                updateParams({
                  q: event.currentTarget.value.trim() || undefined,
                  page: "1",
                });
              }}
            />
            <select
              value={programSlug}
              className={filterSelectClass}
              style={{ backgroundImage: SELECT_CHEVRON, minWidth: 200 }}
              onChange={(event) =>
                updateParams({
                  program: event.target.value || undefined,
                  page: "1",
                })
              }
            >
              <option value="">All programs</option>
              {programOptions.map((option) => (
                <option key={option.id} value={option.slug}>
                  {option.title} ({option.slug})
                </option>
              ))}
            </select>
            <select
              value={status}
              className={filterSelectClass}
              style={{ backgroundImage: SELECT_CHEVRON }}
              onChange={(event) =>
                updateParams({
                  status: event.target.value || "all",
                  page: "1",
                })
              }
            >
              <option value="all">All featured states</option>
              <option value="featured">Featured only</option>
              <option value="not-featured">Not featured</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#ece9e4] bg-[#faf9f7] text-[11px] font-semibold uppercase tracking-wide text-[#a0a0a0]">
                <th className="px-5 py-3">University</th>
                <th className="px-5 py-3">Program</th>
                <th className="px-5 py-3">Ranking</th>
                <th className="px-5 py-3">Tuition</th>
                <th className="px-5 py-3">Featured</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-[13px] text-[#a0a0a0]">
                    No university-program links yet. Add one or import from Excel.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#ece9e4] text-[13px] text-[#4a4a4a] last:border-b-0"
                  >
                    <td className="px-5 py-3">
                      <div className="font-medium text-[#1a1a1a]">{row.universityName}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-[#1a1a1a]">{row.programTitle}</div>
                      <div className="font-mono text-[11px] text-[#a0a0a0]">{row.programSlug}</div>
                    </td>
                    <td className="px-5 py-3">{row.rankingNote || "—"}</td>
                    <td className="px-5 py-3">{row.tuitionNote || "—"}</td>
                    <td className="px-5 py-3">
                      {row.featured ? (
                        <span className="inline-flex rounded-full bg-[#FAEEDA] px-2 py-0.5 text-[10px] font-semibold text-[#854F0B]">
                          Featured
                        </span>
                      ) : (
                        <span className="text-[#a0a0a0]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="inline-flex rounded-[6px] border border-[#e0deda] px-3 py-1.5 text-[12px] font-semibold text-[#4a4a4a] hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
                          onClick={() => setEditRow(row)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === row.id}
                          className="inline-flex rounded-[6px] border border-[#e0deda] px-3 py-1.5 text-[12px] font-semibold text-[#b42318] hover:border-[#b42318] disabled:opacity-60"
                          onClick={() =>
                            handleDelete(
                              row.id,
                              `${row.universityName} · ${row.programTitle}`,
                            )
                          }
                        >
                          {deletingId === row.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-[#ece9e4] px-5 py-4">
          <Pagination
            totalRows={totalRows}
            page={page}
            limit={limit}
            limitOptions={LIMIT_OPTIONS}
          />
        </div>
      </div>

      <AdminEditUniversityProgramDialog
        open={editRow != null}
        row={editRow}
        onClose={() => setEditRow(null)}
      />
    </>
  );
}
