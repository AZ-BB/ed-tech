"use client";

import {
  activateAdminStudent,
  deactivateAdminStudent,
  resetAdminStudentPassword,
} from "@/actions/admin-students";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AdminEditStudentDialog } from "./admin-edit-student-dialog";
import { AdminControl } from "@/app/(protected)/admin/_components/admin-control";

export type AdminStudentActionsProps = {
  studentId: string;
  studentName: string;
  isActive: boolean;
  editDefaults: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    grade: string;
    nationalityCountryCode: string;
    schoolId: string;
    teacherId: string | null;
  };
};

const actionBtnClass =
  "inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border-[1.5px] px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55";

export function AdminStudentActions({
  studentId,
  studentName,
  isActive,
  editDefaults,
}: AdminStudentActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runAction(
    confirmMessage: string,
    action: () => Promise<{ ok: boolean; error?: string; message?: string }>,
  ) {
    if (!window.confirm(confirmMessage)) return;

    setStatusMessage(null);
    setStatusError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setStatusError(result.error ?? "Action failed.");
        return;
      }
      if (result.message) {
        setStatusMessage(result.message);
      }
      router.refresh();
    });
  }

  function handleResetPassword() {
    runAction(
      `Generate a password reset link for ${studentName}? The link will be logged to the server console (email not sent yet).`,
      () => resetAdminStudentPassword(studentId),
    );
  }

  function handleDeactivate() {
    runAction(
      `Deactivate ${studentName}? They will no longer be able to sign in.`,
      () => deactivateAdminStudent(studentId),
    );
  }

  function handleActivate() {
    runAction(
      `Activate ${studentName}? They will be able to sign in again.`,
      () => activateAdminStudent(studentId),
    );
  }

  return (
    <>
      {!isActive ? (
        <span className="inline-flex w-full items-center justify-center rounded-full bg-[rgba(231,76,60,.12)] px-2.5 py-1 text-[11px] font-semibold text-[#8c2d22]">
          Account inactive
        </span>
      ) : null}

      <AdminControl permission="edit_students">
        <button
          type="button"
          disabled={isPending}
          onClick={() => setEditOpen(true)}
          className={`${actionBtnClass} border-[var(--border)] bg-white text-[var(--text-mid)] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)]`}
        >
          Edit
        </button>
      </AdminControl>
      <button
        type="button"
        disabled={isPending}
        onClick={handleResetPassword}
        className={`${actionBtnClass} border-[var(--border)] bg-white text-[var(--text-mid)] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)]`}
      >
        Reset password
      </button>
      {isActive ? (
        <AdminControl permission="edit_students">
          <button
            type="button"
            disabled={isPending}
            onClick={handleDeactivate}
            className={`${actionBtnClass} border-[rgba(231,76,60,.35)] bg-white text-[#c0392b] hover:border-[#E74C3C] hover:bg-[rgba(231,76,60,.06)]`}
          >
            Deactivate
          </button>
        </AdminControl>
      ) : (
        <AdminControl permission="edit_students">
          <button
            type="button"
            disabled={isPending}
            onClick={handleActivate}
            className={`${actionBtnClass} border-[var(--green)] bg-[var(--green)] text-white hover:border-[var(--green-dark)] hover:bg-[var(--green-dark)]`}
          >
            Activate
          </button>
        </AdminControl>
      )}

      {statusError ? (
        <p className="text-[11px] leading-snug text-[#c0392b]" role="alert">
          {statusError}
        </p>
      ) : null}
      {statusMessage ? (
        <p className="text-[11px] leading-snug text-[var(--green-dark)]" role="status">
          {statusMessage}
        </p>
      ) : null}

      <AdminControl permission="edit_students">
        <AdminEditStudentDialog
          open={editOpen}
          studentId={studentId}
          defaults={editDefaults}
          onClose={() => setEditOpen(false)}
        />
      </AdminControl>
    </>
  );
}
