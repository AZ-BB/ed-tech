"use client";

import { exportAdminScholarshipsExcel } from "@/actions/admin-scholarships";
import { exportAdminUniversitiesExcel } from "@/actions/admin-universities";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";

import {
  ADMIN_ANNOUNCEMENTS_HOME,
  ADMIN_CONTENT_HOME,
  ADMIN_NEWS_HOME,
  ADMIN_SCHOLARSHIPS_HOME,
} from "../_data/content-tabs-data";
import {
  triggerAdminScholarshipsExcelDownload,
  triggerScholarshipsSampleExcelDownload,
} from "../_lib/admin-scholarships-excel";
import {
  triggerAdminUniversitiesExcelDownload,
  triggerUniversitiesSampleExcelDownload,
} from "../_lib/admin-universities-excel";
import { AdminAddAnnouncementDialog } from "./admin-add-announcement-dialog";
import { AdminAddNewsDialog } from "./admin-add-news-dialog";
import { AdminAddScholarshipDialog } from "./admin-add-scholarship-dialog";
import { AdminAddUniversityDialog } from "./admin-add-university-dialog";
import { ContentScholarshipsImportDialog } from "./content-scholarships-import-dialog";
import { ContentUniversitiesImportDialog } from "./content-universities-import-dialog";

function normalizePath(pathname: string) {
  return pathname.replace(/\/$/, "") || "/";
}

function HeaderActionIcon({ icon }: { icon: "export" | "import" | "download" | "add" }) {
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

  if (icon === "import") {
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
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
      </svg>
    );
  }

  if (icon === "download") {
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
        <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
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

export function ContentHeaderActions() {
  const pathname = usePathname() ?? "";
  const normalized = normalizePath(pathname);
  const isUniversitiesList = normalized === ADMIN_CONTENT_HOME;
  const isScholarshipsList = normalized === ADMIN_SCHOLARSHIPS_HOME;
  const isAnnouncementsList = normalized === ADMIN_ANNOUNCEMENTS_HOME;
  const isNewsList = normalized === ADMIN_NEWS_HOME;

  const [isExportPending, startExportTransition] = useTransition();
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  if (!isUniversitiesList && !isScholarshipsList && !isAnnouncementsList && !isNewsList) {
    return null;
  }

  function handleExportUniversities() {
    startExportTransition(async () => {
      const result = await exportAdminUniversitiesExcel();

      if (!result.ok) {
        window.alert(result.error);
        return;
      }

      if (result.rows.length === 0) {
        window.alert("No universities to export.");
        return;
      }

      const day = new Date().toISOString().slice(0, 10);
      await triggerAdminUniversitiesExcelDownload(
        result.rows,
        `admin-universities-${day}.xlsx`,
      );
    });
  }

  function handleExportScholarships() {
    startExportTransition(async () => {
      const result = await exportAdminScholarshipsExcel();

      if (!result.ok) {
        window.alert(result.error);
        return;
      }

      if (result.rows.length === 0) {
        window.alert("No scholarships to export.");
        return;
      }

      const day = new Date().toISOString().slice(0, 10);
      await triggerAdminScholarshipsExcelDownload(
        result.rows,
        `admin-scholarships-${day}.xlsx`,
      );
    });
  }

  if (isAnnouncementsList) {
    return (
      <>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-[10px]">
          <button
            type="button"
            className="flex cursor-pointer items-center gap-[6px] rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-[7px] text-[12px] font-semibold text-white transition-all duration-150 hover:bg-[#1B4332]"
            onClick={() => setAddOpen(true)}
          >
            <HeaderActionIcon icon="add" />
            Add Announcement
          </button>
        </div>

        <AdminAddAnnouncementDialog open={addOpen} onClose={() => setAddOpen(false)} />
      </>
    );
  }

  if (isNewsList) {
    return (
      <>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-[10px]">
          <button
            type="button"
            className="flex cursor-pointer items-center gap-[6px] rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-[7px] text-[12px] font-semibold text-white transition-all duration-150 hover:bg-[#1B4332]"
            onClick={() => setAddOpen(true)}
          >
            <HeaderActionIcon icon="add" />
            Add News Item
          </button>
        </div>

        <AdminAddNewsDialog open={addOpen} onClose={() => setAddOpen(false)} />
      </>
    );
  }

  if (isScholarshipsList) {
    return (
      <>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-[10px]">
          <button
            type="button"
            disabled={isExportPending}
            className="flex cursor-pointer items-center gap-[6px] rounded-[8px] border border-[#e0deda] bg-white px-4 py-[7px] text-[12px] font-semibold text-[#4a4a4a] transition-all duration-150 hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleExportScholarships}
          >
            <HeaderActionIcon icon="export" />
            {isExportPending ? "Exporting…" : "Export"}
          </button>
          <button
            type="button"
            className="flex cursor-pointer items-center gap-[6px] rounded-[8px] border border-[#e0deda] bg-white px-4 py-[7px] text-[12px] font-semibold text-[#4a4a4a] transition-all duration-150 hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
            onClick={() => void triggerScholarshipsSampleExcelDownload()}
          >
            <HeaderActionIcon icon="download" />
            Download Sample
          </button>
          <button
            type="button"
            className="flex cursor-pointer items-center gap-[6px] rounded-[8px] border border-[#e0deda] bg-white px-4 py-[7px] text-[12px] font-semibold text-[#4a4a4a] transition-all duration-150 hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
            onClick={() => setImportOpen(true)}
          >
            <HeaderActionIcon icon="import" />
            Bulk Import
          </button>
          <button
            type="button"
            className="flex cursor-pointer items-center gap-[6px] rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-[7px] text-[12px] font-semibold text-white transition-all duration-150 hover:bg-[#1B4332]"
            onClick={() => setAddOpen(true)}
          >
            <HeaderActionIcon icon="add" />
            Add Scholarship
          </button>
        </div>

        <AdminAddScholarshipDialog open={addOpen} onClose={() => setAddOpen(false)} />

        <ContentScholarshipsImportDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-[10px]">
        <button
          type="button"
          disabled={isExportPending}
          className="flex cursor-pointer items-center gap-[6px] rounded-[8px] border border-[#e0deda] bg-white px-4 py-[7px] text-[12px] font-semibold text-[#4a4a4a] transition-all duration-150 hover:border-[#2D6A4F] hover:text-[#2D6A4F] disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleExportUniversities}
        >
          <HeaderActionIcon icon="export" />
          {isExportPending ? "Exporting…" : "Export"}
        </button>
        <button
          type="button"
          className="flex cursor-pointer items-center gap-[6px] rounded-[8px] border border-[#e0deda] bg-white px-4 py-[7px] text-[12px] font-semibold text-[#4a4a4a] transition-all duration-150 hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
          onClick={() => void triggerUniversitiesSampleExcelDownload()}
        >
          <HeaderActionIcon icon="download" />
          Download Sample
        </button>
        <button
          type="button"
          className="flex cursor-pointer items-center gap-[6px] rounded-[8px] border border-[#e0deda] bg-white px-4 py-[7px] text-[12px] font-semibold text-[#4a4a4a] transition-all duration-150 hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
          onClick={() => setImportOpen(true)}
        >
          <HeaderActionIcon icon="import" />
          Bulk Import
        </button>
        <button
          type="button"
          className="flex cursor-pointer items-center gap-[6px] rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-[7px] text-[12px] font-semibold text-white transition-all duration-150 hover:bg-[#1B4332]"
          onClick={() => setAddOpen(true)}
        >
          <HeaderActionIcon icon="add" />
          Add University
        </button>
      </div>

      <AdminAddUniversityDialog open={addOpen} onClose={() => setAddOpen(false)} />

      <ContentUniversitiesImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />
    </>
  );
}
