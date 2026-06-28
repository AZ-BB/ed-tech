"use client";

import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";
import { AddUniversityTargetDialog } from "@/components/application-support/add-university-target-dialog";
import {
  ApplicationUniversityTargetsTable,
  type ApplicationUniversityTargetsTableActions,
} from "@/components/application-support/application-university-targets-table";
import type { UniversityTargetFormState } from "@/components/application-support/university-target-dialog-shared";
import type { ApplicationUniversityTargetRow } from "@/lib/application-university-target-mapper";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ActionResult = { ok: true } | { ok: false; error: string };

export type ApplicationUniversityTargetsActions = ApplicationUniversityTargetsTableActions & {
  createTarget: (
    applicationId: string,
    input: {
      universityId?: string | null;
      universityName: string;
      program?: string | null;
      countryCode?: string | null;
      deadline?: string | null;
      portalUrl?: string | null;
      status: string;
      notes?: string | null;
    },
  ) => Promise<ActionResult>;
};

type ApplicationUniversityTargetsTabProps = {
  applicationId: number;
  targets: ApplicationUniversityTargetRow[];
  universitiesTotal: number;
  actions: ApplicationUniversityTargetsActions;
};

function formToCreateInput(form: UniversityTargetFormState) {
  return {
    universityId: form.universityId || null,
    universityName: form.universityName.trim(),
    program: form.program.trim() || null,
    countryCode: form.countryCode || null,
    deadline: form.deadline || null,
    portalUrl: form.portalUrl.trim() || null,
    status: form.status,
    notes: form.notes.trim() || null,
  };
}

function UniversityUnderLimitWarningIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function formatUniversityUnderLimitMessage(added: number, total: number): string {
  const remaining = total - added;
  const universityWord = remaining === 1 ? "university" : "universities";
  return `This application support package includes ${total} ${total === 1 ? "university" : "universities"}, but only ${added} ${added === 1 ? "has" : "have"} been added. Please add ${remaining} more ${universityWord} to complete the shortlist.`;
}

export function ApplicationUniversityTargetsTab({
  applicationId,
  targets,
  universitiesTotal,
  actions,
}: ApplicationUniversityTargetsTabProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const atPlanLimit = universitiesTotal > 0 && targets.length >= universitiesTotal;
  const underPlanLimit = universitiesTotal > 0 && targets.length < universitiesTotal;
  const underLimitMessage = underPlanLimit
    ? formatUniversityUnderLimitMessage(targets.length, universitiesTotal)
    : null;

  function refresh() {
    router.refresh();
  }

  function handleCreate(form: UniversityTargetFormState) {
    setAddError(null);
    startTransition(async () => {
      const result = await actions.createTarget(String(applicationId), formToCreateInput(form));
      if (!result.ok) {
        setAddError(result.error);
        return;
      }
      setAddOpen(false);
      refresh();
    });
  }

  return (
    <SchoolStudentPanel head="Universities" sub="Track university applications for this case">
      {underLimitMessage ? (
        <div
          role="status"
          title={underLimitMessage}
          aria-label={underLimitMessage}
          className="mb-4 flex items-start gap-2 rounded-[8px] border border-[rgba(212,162,42,.35)] bg-[rgba(212,162,42,.1)] px-3 py-2.5 text-left"
        >
          <UniversityUnderLimitWarningIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A22A]" />
          <p className="text-[12px] leading-snug font-medium text-[#7a5d10]">{underLimitMessage}</p>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-[12px] border border-[#ece9e4] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece9e4] px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-[15px] font-semibold text-[#1a1a1a]">University applications</h3>
            {universitiesTotal > 0 ? (
              <span className="rounded-full bg-[#f5f4f0] px-2.5 py-1 text-[11px] font-semibold text-[#7a7a7a]">
                {targets.length} of {universitiesTotal} included
              </span>
            ) : null}
          </div>
          <button
            type="button"
            disabled={isPending || atPlanLimit}
            onClick={() => {
              setAddError(null);
              setAddOpen(true);
            }}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border border-[var(--green)] bg-[var(--green)] px-3 py-2 text-[12px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add university
          </button>
        </div>

        <ApplicationUniversityTargetsTable
          targets={targets}
          actions={actions}
          emptyMessage="No universities added yet. Use Add university to start the shortlist."
        />
      </div>

      <AddUniversityTargetDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={isPending}
        error={addError}
        searchUniversities={actions.searchUniversities}
      />
    </SchoolStudentPanel>
  );
}
