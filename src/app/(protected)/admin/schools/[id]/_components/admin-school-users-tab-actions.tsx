"use client";

import { exportAdminUsersCsv } from "@/actions/admin-users";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { triggerAdminUsersCsvDownload } from "@/app/(protected)/admin/users/_lib/admin-users-csv";
import { triggerStudentsSampleExcelDownload } from "@/app/(protected)/admin/users/_lib/admin-students-excel";
import { parseAdminUsersSearchParams } from "@/app/(protected)/admin/users/_lib/parse-admin-users-search-params";
import { UsersAddStudentDialog } from "@/app/(protected)/admin/users/_components/users-add-student-dialog";
import { UsersAddTeacherDialog } from "@/app/(protected)/admin/users/_components/users-add-teacher-dialog";
import { UsersStudentImportDialog } from "@/app/(protected)/admin/users/_components/users-student-import-dialog";
import type { UsersTabId } from "@/app/(protected)/admin/users/_data/users-tabs-data";

function HeaderActionIcon({
  icon,
}: {
  icon: "export" | "import" | "add" | "download";
}) {
  if (icon === "export") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
      </svg>
    );
  }
  if (icon === "import") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
      </svg>
    );
  }
  if (icon === "download") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export type AdminSchoolUsersTabActionsProps = {
  tabId: Extract<UsersTabId, "students" | "teachers">;
  schoolId: string;
  schoolName: string;
};

export function AdminSchoolUsersTabActions({
  tabId,
  schoolId,
  schoolName,
}: AdminSchoolUsersTabActionsProps) {
  const searchParams = useSearchParams();
  const [isExportPending, startExportTransition] = useTransition();
  const [importOpen, setImportOpen] = useState(false);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addTeacherOpen, setAddTeacherOpen] = useState(false);

  function handleExport() {
    const filters = parseAdminUsersSearchParams(
      Object.fromEntries(searchParams.entries()),
      schoolId,
    );

    startExportTransition(async () => {
      const result = await exportAdminUsersCsv(tabId, {
        q: filters.q,
        role: filters.role,
        schoolId: filters.schoolId,
        status: filters.status,
      });

      if (!result.ok) {
        window.alert(result.error);
        return;
      }

      if (result.rows.length === 0) {
        window.alert("No users match your current filters.");
        return;
      }

      if (result.format !== "users") {
        window.alert("Unexpected export format.");
        return;
      }

      const day = new Date().toISOString().slice(0, 10);
      triggerAdminUsersCsvDownload(
        result.rows,
        `admin-${tabId}-${schoolId.slice(0, 8)}-${day}.csv`,
      );
    });
  }

  const studentActions = [
    { id: "export", label: "Export", variant: "default" as const, icon: "export" as const },
    { id: "download-sample", label: "Download Sample", variant: "default" as const, icon: "download" as const },
    { id: "bulk-import", label: "Bulk Import", variant: "default" as const, icon: "import" as const },
    { id: "add-student", label: "Add Student", variant: "primary" as const, icon: "add" as const },
  ];

  const teacherActions = [
    { id: "export", label: "Export", variant: "default" as const, icon: "export" as const },
    { id: "add-teacher", label: "Add Teacher", variant: "primary" as const, icon: "add" as const },
  ];

  const actions = tabId === "students" ? studentActions : teacherActions;

  function handleActionClick(actionId: string) {
    if (actionId === "export") {
      handleExport();
      return;
    }
    if (actionId === "download-sample") {
      void triggerStudentsSampleExcelDownload();
      return;
    }
    if (actionId === "bulk-import") {
      setImportOpen(true);
      return;
    }
    if (actionId === "add-student") {
      setAddStudentOpen(true);
      return;
    }
    if (actionId === "add-teacher") {
      setAddTeacherOpen(true);
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-[10px]">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={action.id === "export" && isExportPending}
            className={`flex cursor-pointer items-center gap-[6px] rounded-[8px] border px-4 py-[7px] text-[12px] font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${
              action.variant === "primary"
                ? "border-[#2D6A4F] bg-[#2D6A4F] text-white hover:bg-[#1B4332]"
                : "border-[#e0deda] bg-white text-[#4a4a4a] hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
            }`}
            onClick={() => handleActionClick(action.id)}
          >
            <HeaderActionIcon icon={action.icon} />
            {action.id === "export" && isExportPending ? "Exporting…" : action.label}
          </button>
        ))}
      </div>

      {tabId === "students" ? (
        <>
          <UsersStudentImportDialog
            open={importOpen}
            onClose={() => setImportOpen(false)}
            fixedSchoolId={schoolId}
            fixedSchoolName={schoolName}
          />
          <UsersAddStudentDialog
            open={addStudentOpen}
            onClose={() => setAddStudentOpen(false)}
            fixedSchoolId={schoolId}
            fixedSchoolName={schoolName}
          />
        </>
      ) : null}

      {tabId === "teachers" ? (
        <UsersAddTeacherDialog
          open={addTeacherOpen}
          onClose={() => setAddTeacherOpen(false)}
          fixedSchoolId={schoolId}
          fixedSchoolName={schoolName}
        />
      ) : null}
    </>
  );
}
