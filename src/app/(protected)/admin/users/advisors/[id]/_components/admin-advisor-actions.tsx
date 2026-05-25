"use client";

import {
  activateAdvisor,
  deactivateAdvisor,
} from "@/actions/admin-advisors";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AdminEditAdvisorDialog } from "./admin-edit-advisor-dialog";

export type AdminAdvisorActionsProps = {
  advisorId: string;
  advisorName: string;
  isActive: boolean;
  editDefaults: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    title: string;
    languages: string;
    experienceYears: string;
    nationalityCountryCode: string;
    specializationCountryCodes: string[];
    description: string;
    bestFor: string;
    sessionFor: string;
    sessionCoverage: string;
    about: string;
    questions: string;
    tags: string;
    avatarUrl: string | null;
    isActive: boolean;
  };
};

const actionBtnClass =
  "inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border-[1.5px] px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55";

export function AdminAdvisorActions({
  advisorId,
  advisorName,
  isActive,
  editDefaults,
}: AdminAdvisorActionsProps) {
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

      <button
        type="button"
        disabled={isPending}
        onClick={() => setEditOpen(true)}
        className={`${actionBtnClass} border-[var(--border)] bg-white text-[var(--text-mid)] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)]`}
      >
        Edit
      </button>
      {isActive ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            runAction(
              `Deactivate ${advisorName}? They will no longer appear as an active advisor.`,
              () => deactivateAdvisor(advisorId),
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
              `Activate ${advisorName}? They will appear as an active advisor again.`,
              () => activateAdvisor(advisorId),
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

      <AdminEditAdvisorDialog
        open={editOpen}
        advisorId={advisorId}
        defaults={editDefaults}
        onClose={() => setEditOpen(false)}
      />
    </>
  );
}
