"use client";

import { updateAdminRolePermissionsFromForm } from "@/actions/admin-permissions";
import { AdminControl } from "@/app/(protected)/admin/_components/admin-control";
import {
  ADMIN_PERMISSIONS,
  ADMIN_PERMISSION_LABELS,
  type AdminPermission,
  type AdminRole,
} from "@/lib/admin-permissions";
import {
  ADMIN_ROLE_LABELS,
  EDITABLE_ADMIN_ROLES,
  type AdminRolePermissionTemplates,
} from "@/lib/admin-role-permissions";
import { useRouter } from "next/navigation";
import { useState } from "react";

const sectionClassName =
  "rounded-[12px] border border-[#e8e6e2] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,.04)]";

type Props = {
  rolePermissions: AdminRolePermissionTemplates;
};

function PermissionChecklist({
  permissions,
  role,
}: {
  permissions: AdminPermission[];
  role: AdminRole;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {ADMIN_PERMISSIONS.map((permission) => (
        <label
          key={permission}
          className="flex cursor-pointer items-center gap-2 rounded-[8px] border border-[#f0eeea] px-3 py-2 text-[13px]"
        >
          <input
            type="checkbox"
            name="permissions"
            value={permission}
            defaultChecked={permissions.includes(permission)}
            className="h-4 w-4 shrink-0 accent-[#2D6A4F]"
          />
          <span className="text-[#1a1a1a]">{ADMIN_PERMISSION_LABELS[permission]}</span>
        </label>
      ))}
      <input type="hidden" name="role" value={role} />
    </div>
  );
}

export function AdminSettingsRolePermissions({ rolePermissions }: Props) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<AdminRole>("admin");
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleSuccess, setRoleSuccess] = useState(false);
  const [roleSaving, setRoleSaving] = useState(false);
  const [formKey, setFormKey] = useState(0);

  async function handleRoleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRoleSaving(true);
    setRoleError(null);
    setRoleSuccess(false);

    const result = await updateAdminRolePermissionsFromForm(new FormData(event.currentTarget));
    if (!result.ok) {
      setRoleError(result.error);
      setRoleSaving(false);
      return;
    }

    setRoleSuccess(true);
    setRoleSaving(false);
    setFormKey((value) => value + 1);
    router.refresh();
  }

  return (
    <AdminControl permission="edit_permissions">
      <section className={sectionClassName}>
        <div className="mb-4">
          <h2 className="text-[15px] font-bold text-[#1a1a1a]">Role settings</h2>
          <p className="mt-1 text-[12px] text-[#888]">
            Default permissions copied to new admins when a role is selected.
          </p>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {EDITABLE_ADMIN_ROLES.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => {
                setSelectedRole(role);
                setRoleError(null);
                setRoleSuccess(false);
              }}
              className={`rounded-[8px] border px-3 py-1.5 text-[12px] font-semibold ${
                selectedRole === role
                  ? "border-[#2D6A4F] bg-[#2D6A4F] text-white"
                  : "border-[#e0deda] bg-white text-[#4a4a4a]"
              }`}
            >
              {ADMIN_ROLE_LABELS[role]}
            </button>
          ))}
        </div>

        {selectedRole === "admin" || selectedRole === "moderator" ? (
          <form key={`${selectedRole}-${formKey}`} onSubmit={handleRoleSubmit} className="space-y-3">
            <PermissionChecklist
              permissions={rolePermissions[selectedRole]}
              role={selectedRole}
            />
            {roleError ? <p className="text-[13px] text-red-600">{roleError}</p> : null}
            {roleSuccess ? (
              <p className="text-[13px] text-[#2D6A4F]">Role permissions saved.</p>
            ) : null}
            <button
              type="submit"
              disabled={roleSaving}
              className="rounded-[8px] border border-[#2D6A4F] bg-[#2D6A4F] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
            >
              {roleSaving ? "Saving…" : `Save ${ADMIN_ROLE_LABELS[selectedRole]} permissions`}
            </button>
          </form>
        ) : null}
      </section>
    </AdminControl>
  );
}
