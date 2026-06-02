"use client";

import {
  refreshCurrentAdminSessionAfterPermissionChange,
  updateAdminUserPermissionsFromForm,
} from "@/actions/admin-permissions";
import { AdminControl } from "@/app/(protected)/admin/_components/admin-control";
import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";
import {
  ADMIN_PERMISSIONS,
  ADMIN_PERMISSION_LABELS,
  type AdminPermission,
} from "@/lib/admin-permissions";
import { isSuperAdminRole } from "@/lib/admin-role-permissions";
import { createSupabaseBrowserClient } from "@/utils/supabase-browser";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AdminAdminPermissionsPanelProps = {
  adminId: string;
  adminRole: string;
  initialPermissions: AdminPermission[];
  currentUserId: string | null;
};

export function AdminAdminPermissionsPanel({
  adminId,
  adminRole,
  initialPermissions,
  currentUserId,
}: AdminAdminPermissionsPanelProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const readOnly = isSuperAdminRole(adminRole);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) return;

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    const result = await updateAdminUserPermissionsFromForm(
      adminId,
      new FormData(event.currentTarget),
    );

    if (!result.ok) {
      setError(result.error);
      setIsSaving(false);
      return;
    }

    if (currentUserId && currentUserId === adminId) {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.refreshSession();
      await refreshCurrentAdminSessionAfterPermissionChange();
    }

    setSuccess(true);
    setIsSaving(false);
    router.refresh();
  }

  return (
    <AdminControl permission="edit_permissions">
      <SchoolStudentPanel
        head="Permissions"
        sub={
          readOnly
            ? "Super Admin accounts have full platform access. Their permissions cannot be changed."
            : "Direct permissions assigned to this admin. Role changes do not update these automatically."
        }
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ADMIN_PERMISSIONS.map((permission) => (
              <label
                key={permission}
                className={`flex items-center gap-2 rounded-[8px] border border-[var(--border-light)] px-3 py-2 text-[13px] ${
                  readOnly ? "cursor-not-allowed opacity-80" : "cursor-pointer"
                }`}
              >
                <input
                  type="checkbox"
                  name={readOnly ? undefined : "permissions"}
                  value={permission}
                  defaultChecked={initialPermissions.includes(permission)}
                  disabled={readOnly}
                  className="h-4 w-4 shrink-0 accent-[var(--green)] disabled:cursor-not-allowed"
                />
                <span className="text-[var(--text)]">{ADMIN_PERMISSION_LABELS[permission]}</span>
              </label>
            ))}
          </div>

          {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
          {success ? (
            <p className="text-[13px] text-[var(--green-dark)]">Permissions saved.</p>
          ) : null}

          {!readOnly ? (
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-[8px] border border-[var(--green)] bg-[var(--green)] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "Save permissions"}
            </button>
          ) : null}
        </form>
      </SchoolStudentPanel>
    </AdminControl>
  );
}
