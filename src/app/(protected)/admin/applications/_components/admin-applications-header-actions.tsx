"use client";

import { exportAdminApplicationsExcel } from "@/actions/admin-applications";
import { useTransition } from "react";

import { triggerAdminApplicationsExcelDownload } from "../_lib/admin-applications-excel";

function ExportIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

export function AdminApplicationsHeaderActions() {
  const [isExportPending, startExportTransition] = useTransition();

  function handleExport() {
    startExportTransition(async () => {
      const result = await exportAdminApplicationsExcel();

      if (!result.ok) {
        window.alert(result.error);
        return;
      }

      if (result.rows.length === 0) {
        window.alert("There are no applications to export.");
        return;
      }

      const day = new Date().toISOString().slice(0, 10);
      await triggerAdminApplicationsExcelDownload(
        result.rows,
        `admin-applications-${day}.xlsx`,
      );
    });
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-[10px]">
      <button
        type="button"
        disabled={isExportPending}
        className="flex cursor-pointer items-center gap-[6px] rounded-[8px] border border-[#e0deda] bg-white px-4 py-[7px] text-[12px] font-semibold text-[#4a4a4a] transition-all duration-150 hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:cursor-not-allowed disabled:opacity-60"
        onClick={handleExport}
      >
        <ExportIcon />
        {isExportPending ? "Exporting…" : "Export"}
      </button>
    </div>
  );
}
