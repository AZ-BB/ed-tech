"use client";

import { exportAdminUsersCsv } from "@/actions/admin-users";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { triggerAdminUsersCsvDownload } from "../_lib/admin-users-csv";
import {
  triggerAdvisorsExcelDownload,
  triggerAdvisorsSampleExcelDownload,
} from "../_lib/admin-advisors-excel";
import {
  triggerAmbassadorsExcelDownload,
  triggerAmbassadorsSampleExcelDownload,
} from "../_lib/admin-ambassadors-excel";
import { triggerStudentsSampleExcelDownload } from "../_lib/admin-students-excel";
import { parseAdminUsersSearchParams } from "../_lib/parse-admin-users-search-params";
import {
  getUsersHeaderActions,
  getUsersTabFromPath,
  isAdminUsersPath,
  type UsersTabId,
} from "../_data/users-tabs-data";
import {
  AdminUserCreateDialogs,
  useAdminUserCreateDialogs,
} from "./admin-user-create-dialogs";
import { AdminControl } from "../../_components/admin-control";
import { UsersCsvImportDialog } from "./users-csv-import-dialog";
import { UsersStudentImportDialog } from "./users-student-import-dialog";
import type { AdminPermission } from "@/lib/admin-permissions";

const HEADER_ACTION_PERMISSION: Partial<Record<string, AdminPermission>> = {
  "add-student": "edit_students",
  "add-teacher": "edit_teachers",
  "add-advisor": "edit_advisors",
  "add-ambassador": "edit_ambassadors",
  "add-admin": "edit_admins",
};

const TAB_EDIT_PERMISSION: Partial<Record<UsersTabId, AdminPermission>> = {
  students: "edit_students",
  advisors: "edit_advisors",
  ambassadors: "edit_ambassadors",
};

function headerActionPermission(
  actionId: string,
  tabId: UsersTabId,
): AdminPermission | null {
  const direct = HEADER_ACTION_PERMISSION[actionId];
  if (direct) return direct;

  if (actionId === "bulk-import" || actionId === "download-sample") {
    return TAB_EDIT_PERMISSION[tabId] ?? null;
  }

  return null;
}

function HeaderActionIcon({
  icon,
}: {
  icon: "export" | "import" | "add" | "download";
}) {
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

function importConfigForTab(tabId: UsersTabId) {
  if (tabId === "ambassadors") {
    return {
      title: "Bulk Import Ambassadors",
      endpoint: "/api/admin/ambassadors/import",
    };
  }

  if (tabId === "advisors") {
    return {
      title: "Bulk Import Advisors",
      endpoint: "/api/admin/advisors/import",
    };
  }

  return null;
}

export function UsersHeaderActions() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const [isExportPending, startExportTransition] = useTransition();
  const [importOpen, setImportOpen] = useState(false);
  const [studentImportOpen, setStudentImportOpen] = useState(false);
  const { openRole, openDialog, closeDialog } = useAdminUserCreateDialogs();

  if (!isAdminUsersPath(pathname)) return null;

  const tabId = getUsersTabFromPath(pathname);
  const actions = getUsersHeaderActions(tabId);
  const importConfig = importConfigForTab(tabId);

  function handleExport() {
    const filters = parseAdminUsersSearchParams(
      Object.fromEntries(searchParams.entries()),
    );

    startExportTransition(async () => {
      const result = await exportAdminUsersCsv(tabId, {
        q: filters.q,
        role: filters.role,
        schoolId: filters.schoolId,
        status: filters.status,
        teacher: filters.teacher,
      });

      if (!result.ok) {
        window.alert(result.error);
        return;
      }

      const day = new Date().toISOString().slice(0, 10);

      if (result.format === "ambassadors") {
        if (result.rows.length === 0) {
          window.alert("No ambassadors match your current filters.");
          return;
        }
        await triggerAmbassadorsExcelDownload(result.rows, `admin-ambassadors-${day}.xlsx`);
        return;
      }

      if (result.format === "advisors") {
        if (result.rows.length === 0) {
          window.alert("No advisors match your current filters.");
          return;
        }
        await triggerAdvisorsExcelDownload(result.rows, `admin-advisors-${day}.xlsx`);
        return;
      }

      if (result.rows.length === 0) {
        window.alert("No users match your current filters.");
        return;
      }

      triggerAdminUsersCsvDownload(result.rows, `admin-users-${tabId}-${day}.csv`);
    });
  }

  async function handleDownloadSample() {
    if (tabId === "students") {
      await triggerStudentsSampleExcelDownload();
      return;
    }

    if (tabId === "ambassadors") {
      await triggerAmbassadorsSampleExcelDownload();
      return;
    }

    if (tabId === "advisors") {
      await triggerAdvisorsSampleExcelDownload();
    }
  }

  function handleActionClick(actionId: string) {
    if (actionId === "export") {
      handleExport();
      return;
    }

    if (actionId === "download-sample") {
      void handleDownloadSample();
      return;
    }

    if (actionId === "bulk-import") {
      if (tabId === "students") {
        setStudentImportOpen(true);
        return;
      }
      setImportOpen(true);
      return;
    }

    if (actionId === "add-admin") {
      openDialog("admin");
      return;
    }

    if (actionId === "add-ambassador") {
      openDialog("ambassador");
      return;
    }

    if (actionId === "add-advisor") {
      openDialog("advisor");
      return;
    }

    if (actionId === "add-student") {
      openDialog("student");
      return;
    }

    if (actionId === "add-teacher") {
      openDialog("school_admin");
    }
  }

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-[10px]">
        {actions.map((action) => {
          const button = (
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
          );

          const permission = headerActionPermission(action.id, tabId);
          if (permission) {
            return (
              <AdminControl key={action.id} permission={permission}>
                {button}
              </AdminControl>
            );
          }

          return button;
        })}
      </div>

      {importConfig ? (
        <UsersCsvImportDialog
          open={importOpen}
          title={importConfig.title}
          endpoint={importConfig.endpoint}
          onClose={() => setImportOpen(false)}
        />
      ) : null}

      {tabId === "students" ? (
        <>
          <UsersStudentImportDialog
            open={studentImportOpen}
            onClose={() => setStudentImportOpen(false)}
          />
        </>
      ) : null}

      <AdminUserCreateDialogs openRole={openRole} onClose={closeDialog} />
    </>
  );
}
