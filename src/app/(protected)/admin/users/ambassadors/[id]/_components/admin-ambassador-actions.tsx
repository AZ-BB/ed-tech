"use client";

import {
  activateAmbassador,
  deactivateAmbassador,
} from "@/actions/admin-ambassadors";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AdminEditAmbassadorDialog } from "./admin-edit-ambassador-dialog";
import { AdminControl } from "@/app/(protected)/admin/_components/admin-control";

export type AdminAmbassadorActionsProps = {
  ambassadorId: string;
  ambassadorName: string;
  isActive: boolean;
  editDefaults: {
    firstName: string;
    lastName: string;
    email: string;
    destinationCountryCode: string;
    nationalityCountryCode: string;
    universityId: string;
    universityName: string;
    major: string;
    startYear: string;
    graduationYear: string;
    isCurrentStudent: boolean;
    hasMsc: boolean;
    hasPhd: boolean;
    about: string;
    helpIn: string;
    tags: string;
    avatarUrl: string | null;
    isActive: boolean;
  };
};

const actionBtnClass =
  "inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border-[1.5px] px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55";

export function AdminAmbassadorActions({
  ambassadorId,
  ambassadorName,
  isActive,
  editDefaults,
}: AdminAmbassadorActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runAction(
    confirmMessage: string,
    action: () => Promise<{ ok: boolean; error?: string }>,
  ) {
    if (!window.confirm(confirmMessage)) return;

    setStatusError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setStatusError(result.error ?? "Action failed.");
        return;
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

      <AdminControl permission="edit_ambassadors">
        <button
          type="button"
          disabled={isPending}
          onClick={() => setEditOpen(true)}
          className={`${actionBtnClass} border-[var(--border)] bg-white text-[var(--text-mid)] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)]`}
        >
          Edit
        </button>
      </AdminControl>
      {isActive ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            runAction(
              `Deactivate ${ambassadorName}? They will no longer appear as an active ambassador.`,
              () => deactivateAmbassador(ambassadorId),
            )
          }
          className={`${actionBtnClass} border-[rgba(231,76,60,.35)] bg-white text-[#c0392b] hover:border-[#E74C3C] hover:bg-[rgba(231,76,60,.06)]`}
        >
          Deactivate
        </button>
      ) : (
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            runAction(
              `Activate ${ambassadorName}? They will appear as an active ambassador again.`,
              () => activateAmbassador(ambassadorId),
            )
          }
          className={`${actionBtnClass} border-[var(--green)] bg-[var(--green)] text-white hover:border-[var(--green-dark)] hover:bg-[var(--green-dark)]`}
        >
          Activate
        </button>
      )}

      {statusError ? (
        <p className="text-[11px] leading-snug text-[#c0392b]" role="alert">
          {statusError}
        </p>
      ) : null}

      <AdminControl permission="edit_ambassadors">
        <AdminEditAmbassadorDialog
          open={editOpen}
          ambassadorId={ambassadorId}
          defaults={editDefaults}
          onClose={() => setEditOpen(false)}
        />
      </AdminControl>
    </>
  );
}
