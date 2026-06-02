"use client";

import {
  type AdminPermission,
  hasAdminPermission,
} from "@/lib/admin-permissions";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

type AdminPermissionsContextValue = {
  permissions: AdminPermission[];
  hasPermission: (permission: AdminPermission) => boolean;
};

const AdminPermissionsContext = createContext<AdminPermissionsContextValue | null>(null);

export function AdminPermissionsProvider({
  permissions,
  children,
}: {
  permissions: AdminPermission[];
  children: ReactNode;
}) {
  const hasPermission = useCallback(
    (permission: AdminPermission) => hasAdminPermission(permissions, permission),
    [permissions],
  );

  const value = useMemo(
    () => ({ permissions, hasPermission }),
    [permissions, hasPermission],
  );

  return (
    <AdminPermissionsContext.Provider value={value}>{children}</AdminPermissionsContext.Provider>
  );
}

export function useAdminPermissions(): AdminPermissionsContextValue {
  const ctx = useContext(AdminPermissionsContext);
  if (!ctx) {
    throw new Error("useAdminPermissions must be used within AdminPermissionsProvider");
  }
  return ctx;
}
