"use client";

import type { AdminPermission } from "@/lib/admin-permissions";
import type { ReactNode } from "react";

import { useAdminPermissions } from "./admin-permissions-provider";

type AdminControlProps = {
  permission: AdminPermission;
  children: ReactNode;
  fallback?: ReactNode;
};

export function AdminControl({
  permission,
  children,
  fallback = null,
}: AdminControlProps) {
  const { hasPermission } = useAdminPermissions();
  return hasPermission(permission) ? children : fallback;
}
