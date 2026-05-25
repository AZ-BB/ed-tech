"use client";

import { exportAdminSchoolsExcel } from "@/actions/admin-schools";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { triggerAdminSchoolsExcelDownload } from "../_lib/admin-schools-excel";
import { parseAdminSchoolsSearchParams } from "../_lib/parse-admin-schools-search-params";
import { AdminAddSchoolDialog } from "./admin-add-school-dialog";

function HeaderActionIcon({ icon }: { icon: "export" | "add" }) {
  if (icon === "export") {
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
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function SchoolsHeaderActions() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const [isExportPending, startExportTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);

  const isSchoolsListPage = pathname.replace(/\/$/, "") === "/admin/schools";
  if (!isSchoolsListPage) return null;

  function handleExport() {
    const filters = parseAdminSchoolsSearchParams(
      Object.fromEntries(searchParams.entries()),
    );

    startExportTransition(async () => {
      const result = await exportAdminSchoolsExcel({
        q: filters.q,
        status: filters.status,
      });

      if (!result.ok) {
        window.alert(result.error);
        return;
      }

      if (result.rows.length === 0) {
        window.alert("No schools match your current filters.");
        return;
      }

      const day = new Date().toISOString().slice(0, 10);
      await triggerAdminSchoolsExcelDownload(result.rows, `admin-schools-${day}.xlsx`);
    });
  }

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-[10px]">
        <button
          type="button"
          disabled={isExportPending}
          className="flex cursor-pointer items-center gap-[6px] rounded-[8px] border border-[#e0deda] bg-white px-4 py-[7px] text-[12px] font-semibold text-[#4a4a4a] transition-all duration-150 hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleExport}
        >
          <HeaderActionIcon icon="export" />
          {isExportPending ? "Exporting…" : "Export"}
        </button>
        <button
          type="button"
          className="flex cursor-pointer items-center gap-[6px] rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-[7px] text-[12px] font-semibold text-white transition-all duration-150 hover:bg-[#1B4332]"
          onClick={() => setAddOpen(true)}
        >
          <HeaderActionIcon icon="add" />
          Add School
        </button>
      </div>

      <AdminAddSchoolDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
