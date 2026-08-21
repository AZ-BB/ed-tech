"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { loadFunnelStudentsList } from "@/actions/admin-funnel-students";
import type {
  AdminFunnelKey,
  AdminFunnelStudentRow,
} from "@/app/(protected)/admin/funnels/_lib/fetch-funnel-students-list";
import { Pagination } from "@/components/pagination";

const LIMIT_OPTIONS = [10, 20, 50] as const;

type OpenFunnel = {
  key: AdminFunnelKey;
  label: string;
};

type AdminFunnelStudentsDialogProps = {
  openFunnel: OpenFunnel | null;
  onClose: () => void;
};

export function AdminFunnelStudentsDialog({
  openFunnel,
  onClose,
}: AdminFunnelStudentsDialogProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(10);
  const [rows, setRows] = useState<AdminFunnelStudentRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fetchGenerationRef = useRef(0);

  const fetchList = useCallback(
    async (
      funnelKey: AdminFunnelKey,
      nextPage: number,
      nextLimit: number,
      options: { resetList: boolean },
    ) => {
      const generation = ++fetchGenerationRef.current;

      if (options.resetList) {
        setRows([]);
        setTotalRows(0);
      }
      setError(null);
      setIsLoading(true);

      const result = await loadFunnelStudentsList(funnelKey, nextPage, nextLimit);

      if (generation !== fetchGenerationRef.current) return;

      if (!result.ok) {
        setError(result.error);
        setRows([]);
        setTotalRows(0);
        setIsLoading(false);
        return;
      }

      setRows(result.rows);
      setTotalRows(result.totalRows);
      setIsLoading(false);
    },
    [],
  );

  useEffect(() => {
    if (!openFunnel) {
      fetchGenerationRef.current += 1;
      setRows([]);
      setTotalRows(0);
      setError(null);
      setIsLoading(false);
      return;
    }

    setPage(1);
    setLimit(10);
    void fetchList(openFunnel.key, 1, 10, { resetList: true });
  }, [openFunnel?.key, fetchList]);

  useEffect(() => {
    if (!openFunnel) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openFunnel, onClose, isLoading]);

  if (!openFunnel) return null;

  const handlePaginationChange = (next: { page: number; limit: number }) => {
    setPage(next.page);
    setLimit(next.limit);
    void fetchList(openFunnel.key, next.page, next.limit, { resetList: true });
  };

  return (
    <div
      className="fixed inset-0 z-1000 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-funnel-students-title"
      aria-busy={isLoading}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default border-0 bg-black/45"
        onClick={isLoading ? undefined : onClose}
        aria-label="Close list"
        disabled={isLoading}
      />
      <div className="relative flex max-h-[min(85vh,720px)] w-full max-w-[720px] flex-col overflow-hidden rounded-xl border border-[#ece9e4] bg-white shadow-xl">
        <div className="border-b border-[#ece9e4] px-5 py-4">
          <h2
            id="admin-funnel-students-title"
            className="text-[17px] font-semibold tracking-tight text-[#1a1a1a]"
          >
            {openFunnel.label} signups
          </h2>
          <p className="mt-1 text-[12px] text-[#6a6a6a]">
            {totalRows.toLocaleString()} {totalRows === 1 ? "student" : "students"}
          </p>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {isLoading ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 px-3 py-8">
              <div
                className="h-6 w-6 animate-spin rounded-full border-2 border-[#e0deda] border-t-[#2D6A4F]"
                aria-hidden
              />
              <p className="text-[13px] text-[#6a6a6a]">Loading…</p>
            </div>
          ) : error ? (
            <p className="px-3 py-8 text-center text-[13px] text-[#E74C3C]">{error}</p>
          ) : rows.length === 0 ? (
            <p className="px-3 py-8 text-center text-[13px] text-[#6a6a6a]">No students found.</p>
          ) : (
            <div className="overflow-x-auto px-1">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#fafaf8]">
                    {["Student", "Email", "Grade", "Signed up", ""].map((heading) => (
                      <th
                        key={heading || "actions"}
                        className="border-b border-[#ece9e4] px-3 py-[10px] text-left text-[10px] font-bold uppercase tracking-[0.8px] text-[#a0a0a0]"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const isLastRow = index === rows.length - 1;
                    const cellBorder = isLastRow ? "" : "border-b border-[#ece9e4]";

                    return (
                      <tr key={row.id} className="transition-colors hover:bg-[#f0f7f2]">
                        <td className={`${cellBorder} px-3 py-3 text-[13px] font-medium text-[#1a1a1a]`}>
                          {row.name}
                        </td>
                        <td className={`${cellBorder} px-3 py-3 text-[13px] text-[#4a4a4a]`}>
                          {row.email}
                        </td>
                        <td className={`${cellBorder} px-3 py-3 text-[13px] text-[#4a4a4a]`}>
                          {row.grade}
                        </td>
                        <td className={`${cellBorder} px-3 py-3 text-[13px] text-[#4a4a4a]`}>
                          {row.signedUpAt}
                        </td>
                        <td className={`${cellBorder} px-3 py-3 text-right`}>
                          <Link
                            href={row.href}
                            className="inline-flex rounded-lg border border-[#e0deda] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#2D6A4F] transition-colors hover:border-[#2D6A4F] hover:bg-[#f0f7f2]"
                            onClick={onClose}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border-t border-[#ece9e4] px-4 py-3">
          <Pagination
            totalRows={totalRows}
            page={page}
            limit={limit}
            limitOptions={LIMIT_OPTIONS}
            syncSearchParams={false}
            onChange={handlePaginationChange}
          />
        </div>

        <div className="flex justify-end border-t border-[#ece9e4] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg border border-[#e0deda] bg-white px-4 py-2 text-[13px] font-semibold text-[#4a4a4a] transition-colors hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
