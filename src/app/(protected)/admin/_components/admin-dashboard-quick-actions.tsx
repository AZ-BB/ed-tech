"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdminAddAnnouncementDialog } from "../content/_components/admin-add-announcement-dialog";
import {
  AdminUserCreateDialogs,
  type AdminUserCreateRole,
  useAdminUserCreateDialogs,
} from "../users/_components/admin-user-create-dialogs";

function icon(action: "user" | "announcement" | "report") {
  if (action === "user")
    return (
      <>
        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <path d="M20 8v6M23 11h-6" />
      </>
    );
  if (action === "announcement")
    return (
      <>
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
        <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
      </>
    );
  return (
    <>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
    </>
  );
}

const roles: { id: AdminUserCreateRole; label: string }[] = [
  { id: "student", label: "Student" },
  { id: "school_admin", label: "School Counselor" },
  { id: "admin", label: "Admin" },
  { id: "ambassador", label: "Ambassador" },
  { id: "advisor", label: "Advisor" },
];

export function AdminDashboardQuickActions() {
  const router = useRouter();
  const [addAnnouncementOpen, setAddAnnouncementOpen] = useState(false);
  const [userRolePickerOpen, setUserRolePickerOpen] = useState(false);
  const { openRole, openDialog, closeDialog } = useAdminUserCreateDialogs();

  return (
    <>
      <div className="mb-4 text-[15px] font-semibold tracking-[-0.01em] text-[#1a1a1a]">Quick Actions</div>
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <ActionCard
          title="Add User"
          subtitle="Choose role before creating"
          colorClass="bg-[#E3F2FD] text-[#3498DB]"
          iconName="user"
          onClick={() => setUserRolePickerOpen(true)}
        />
        <ActionCard
          title="Add Announcement"
          subtitle="Push to all dashboards"
          colorClass="bg-[#FFF3E0] text-[#E67E22]"
          iconName="announcement"
          onClick={() => setAddAnnouncementOpen(true)}
        />
        <ActionCard
          title="Generate Report"
          subtitle="Monthly school report"
          colorClass="bg-[#F3E5F5] text-[#8E44AD]"
          iconName="report"
          onClick={() => router.push("/admin/reports")}
        />
      </div>

      {userRolePickerOpen ? (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal
            aria-labelledby="admin-user-role-picker-title"
            className="w-full max-w-md rounded-[12px] border border-[#ece9e4] bg-white p-5 shadow-xl"
          >
            <div className="mb-3 text-[16px] font-semibold text-[#1a1a1a]" id="admin-user-role-picker-title">
              Add User
            </div>
            <p className="mb-4 text-[12px] text-[#6a6a6a]">Select which user type you want to create.</p>
            <div className="grid gap-2">
              {roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-3 py-2 text-left text-[12px] font-semibold text-[#4a4a4a] transition-all hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
                  onClick={() => {
                    setUserRolePickerOpen(false);
                    openDialog(role.id);
                  }}
                >
                  {role.label}
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[#4a4a4a]"
                onClick={() => setUserRolePickerOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AdminAddAnnouncementDialog
        open={addAnnouncementOpen}
        onClose={() => setAddAnnouncementOpen(false)}
      />
      <AdminUserCreateDialogs openRole={openRole} onClose={closeDialog} />
    </>
  );
}

function ActionCard({
  title,
  subtitle,
  colorClass,
  iconName,
  onClick,
  disabled = false,
}: {
  title: string;
  subtitle: string;
  colorClass: string;
  iconName: "user" | "announcement" | "report";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={`flex items-center gap-3 rounded-[12px] border border-[#ece9e4] bg-white p-4 text-left transition-all ${
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:border-[#2D6A4F] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
      }`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] ${colorClass}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden>
          {icon(iconName)}
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] font-semibold text-[#4a4a4a]">{title}</span>
        <span className="block text-[10px] text-[#a0a0a0]">{subtitle}</span>
      </span>
    </button>
  );
}
