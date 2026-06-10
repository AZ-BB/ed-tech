"use client";

import {
  activateAdminAdmin,
  deactivateAdminAdmin,
  resetAdminAdminPassword,
} from "@/actions/admin-admins";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AdminEditPlatformAdminDialog } from "./admin-edit-admin-dialog";
import { AdminControl } from "@/app/(protected)/admin/_components/admin-control";

export type AdminPlatformAdminActionsProps = {
  adminId: string;
  adminName: string;
  isActive: boolean;
  editDefaults: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: string;
  };
};

const actionBtnClass =
  "inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border-[1.5px] px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55";

export function AdminPlatformAdminActions({
  adminId,
  adminName,
  isActive,
  editDefaults,
}: AdminPlatformAdminActionsProps) {
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

  return (
    <>
      {!isActive ? (
        <span className="inline-flex w-full items-center justify-center rounded-full bg-[rgba(231,76,60,.12)] px-2.5 py-1 text-[11px] font-semibold text-[#8c2d22]">
          Account inactive
        </span>
      ) : null}

      <AdminControl permission="edit_admins">
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
        onClick={() =>
          runAction(
            `Send a password reset email to ${adminName}?`,
            () => resetAdminAdminPassword(adminId),
          )
        }
        className={`${actionBtnClass} border-[var(--border)] bg-white text-[var(--text-mid)] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)]`}
      >
        Reset password
      </button>
      {isActive ? (
        <AdminControl permission="edit_admins">
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              runAction(
                `Deactivate ${adminName}? They will no longer be able to sign in.`,
                () => deactivateAdminAdmin(adminId),
              )
            }
            className={`${actionBtnClass} border-[rgba(231,76,60,.35)] bg-white text-[#c0392b] hover:border-[#E74C3C] hover:bg-[rgba(231,76,60,.06)]`}
          >
            Deactivate
          </button>
        </AdminControl>
      ) : (
        <AdminControl permission="edit_admins">
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              runAction(
                `Activate ${adminName}? They will be able to sign in again.`,
                () => activateAdminAdmin(adminId),
              )
            }
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

      <AdminControl permission="edit_admins">
        <AdminEditPlatformAdminDialog
          open={editOpen}
          adminId={adminId}
          defaults={editDefaults}
          onClose={() => setEditOpen(false)}
        />
      </AdminControl>
    </>
  );
}
