"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { loadAdminDashboardKpiList } from "@/actions/admin-dashboard-kpi";
import { Pagination } from "@/components/pagination";
import type { AdminDashboardKpiKey } from "../_lib/fetch-admin-dashboard";
import type { AdminDashboardKpiListItem } from "../_lib/fetch-admin-dashboard-kpi-list";

const KPI_LIMIT_OPTIONS = [10, 20, 50] as const;

type OpenKpi = {
  key: AdminDashboardKpiKey;
  label: string;
};

type AdminDashboardKpiListDialogProps = {
  openKpi: OpenKpi | null;
  onClose: () => void;
};

export function AdminDashboardKpiListDialog({
  openKpi,
  onClose,
}: AdminDashboardKpiListDialogProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(10);
  const [rows, setRows] = useState<AdminDashboardKpiListItem[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fetchGenerationRef = useRef(0);

  const fetchList = useCallback(
    async (
      kpiKey: AdminDashboardKpiKey,
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

      const result = await loadAdminDashboardKpiList(kpiKey, nextPage, nextLimit);

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
    if (!openKpi) {
      fetchGenerationRef.current += 1;
      setRows([]);
      setTotalRows(0);
      setError(null);
      setIsLoading(false);
      return;
    }

    setPage(1);
    setLimit(10);
    void fetchList(openKpi.key, 1, 10, { resetList: true });
  }, [openKpi?.key, fetchList]);

  useEffect(() => {
    if (!openKpi) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openKpi, onClose, isLoading]);

  if (!openKpi) return null;

  const handlePaginationChange = (next: { page: number; limit: number }) => {
    setPage(next.page);
    setLimit(next.limit);
    void fetchList(openKpi.key, next.page, next.limit, { resetList: true });
  };

  return (
    <div
      className="fixed inset-0 z-1000 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-kpi-list-title"
      aria-busy={isLoading}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default border-0 bg-black/45"
        onClick={isLoading ? undefined : onClose}
        aria-label="Close list"
        disabled={isLoading}
      />
      <div className="relative flex max-h-[min(85vh,720px)] w-full max-w-[560px] flex-col overflow-hidden rounded-xl border border-[#ece9e4] bg-white shadow-xl">
        <div className="border-b border-[#ece9e4] px-5 py-4">
          <h2
            id="admin-kpi-list-title"
            className="text-[17px] font-semibold tracking-tight text-[#1a1a1a]"
          >
            {openKpi.label}
          </h2>
          <p className="mt-1 text-[12px] text-[#6a6a6a]">
            Select a row to open its detail page.
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
            <p className="px-3 py-8 text-center text-[13px] text-[#6a6a6a]">No records found.</p>
          ) : (
            <ul className="divide-y divide-[#ece9e4]">
              {rows.map((row) => (
                <li key={row.id}>
                  <Link
                    href={row.href}
                    className="block rounded-lg px-3 py-3 transition-colors hover:bg-[#f0f7f2]"
                    onClick={onClose}
                  >
                    <div className="text-[13px] font-medium text-[#1a1a1a]">{row.title}</div>
                    {row.subtitle ? (
                      <div className="mt-0.5 text-[11px] text-[#6a6a6a]">{row.subtitle}</div>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-[#ece9e4] px-4 py-3">
          <Pagination
            totalRows={totalRows}
            page={page}
            limit={limit}
            limitOptions={KPI_LIMIT_OPTIONS}
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
