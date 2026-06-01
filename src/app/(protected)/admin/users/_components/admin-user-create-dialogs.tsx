"use client";

import { useState } from "react";

import { UsersAddAdminDialog } from "./users-add-admin-dialog";
import { UsersAddAdvisorDialog } from "./users-add-advisor-dialog";
import { UsersAddAmbassadorDialog } from "./users-add-ambassador-dialog";
import { UsersAddStudentDialog } from "./users-add-student-dialog";
import { UsersAddTeacherDialog } from "./users-add-teacher-dialog";

export type AdminUserCreateRole =
  | "student"
  | "school_admin"
  | "admin"
  | "ambassador"
  | "advisor";

export function useAdminUserCreateDialogs() {
  const [openRole, setOpenRole] = useState<AdminUserCreateRole | null>(null);
  return {
    openRole,
    openDialog: setOpenRole,
    closeDialog: () => setOpenRole(null),
  };
}

export function AdminUserCreateDialogs({
  openRole,
  onClose,
}: {
  openRole: AdminUserCreateRole | null;
  onClose: () => void;
}) {
  return (
    <>
      <UsersAddStudentDialog open={openRole === "student"} onClose={onClose} />
      <UsersAddTeacherDialog open={openRole === "school_admin"} onClose={onClose} />
      <UsersAddAdminDialog open={openRole === "admin"} onClose={onClose} />
      <UsersAddAmbassadorDialog open={openRole === "ambassador"} onClose={onClose} />
      <UsersAddAdvisorDialog open={openRole === "advisor"} onClose={onClose} />
    </>
  );
}
