"use client";

import { EditUniversityTargetDialog } from "@/components/application-support/edit-university-target-dialog";
import type { UniversityTargetFormState } from "@/components/application-support/university-target-dialog-shared";
import {
  UNIVERSITY_TARGET_DECISION_OPTIONS,
  UNIVERSITY_TARGET_STATUS_OPTIONS,
} from "@/lib/application-university-target-constants";
import type { ApplicationUniversityTargetRow } from "@/lib/application-university-target-mapper";
import type { UniversityCatalogSearchResult } from "@/lib/search-universities-catalog";
import { useRouter } from "next/navigation";
import { type ReactNode, useState, useTransition } from "react";

type ActionResult = { ok: true } | { ok: false; error: string };

export type ApplicationUniversityTargetsTableActions = {
  searchUniversities: (
    query: string,
  ) => Promise<
    | { ok: true; results: UniversityCatalogSearchResult[] }
    | { ok: false; error: string }
  >;
  updateTarget: (
    targetId: string,
    input: {
      universityId?: string | null;
      universityName: string;
      program?: string | null;
      countryCode?: string | null;
      deadline?: string | null;
      portalUrl?: string | null;
      decision: string;
      notes?: string | null;
    },
  ) => Promise<ActionResult>;
  updateTargetStatus: (targetId: string, status: string) => Promise<ActionResult>;
  updateTargetDecision: (targetId: string, decision: string) => Promise<ActionResult>;
};

export const UNIVERSITY_TARGET_SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

export const universityTargetStatusSelectClass =
  "w-[118px] max-w-[118px] cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_6px_center] bg-no-repeat py-1 pl-2 pr-6 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C] disabled:cursor-not-allowed disabled:opacity-60";

export const universityTargetDecisionSelectClass =
  "w-[128px] max-w-[128px] cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_6px_center] bg-no-repeat py-1 pl-2 pr-6 text-[13px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C] disabled:cursor-not-allowed disabled:opacity-60";

const iconBtnClass =
  "inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[8px] border border-[#e0deda] bg-white text-[#4a4a4a] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] disabled:cursor-not-allowed disabled:opacity-45";

function formToUpdateInput(form: UniversityTargetFormState) {
  return {
    universityId: form.universityId || null,
    universityName: form.universityName.trim(),
    program: form.program.trim() || null,
    countryCode: form.countryCode || null,
    deadline: form.deadline || null,
    portalUrl: form.portalUrl.trim() || null,
    decision: form.decision,
    notes: form.notes.trim() || null,
  };
}

type ApplicationUniversityTargetsTableProps = {
  targets: ApplicationUniversityTargetRow[];
  actions: ApplicationUniversityTargetsTableActions;
  emptyMessage?: string;
  renderLeadingColumns?: (target: ApplicationUniversityTargetRow) => ReactNode;
  leadingHeaderColumns?: ReactNode;
  renderExtraActions?: (target: ApplicationUniversityTargetRow) => ReactNode;
  minWidthClass?: string;
};

export function ApplicationUniversityTargetsTable({
  targets,
  actions,
  emptyMessage = "No universities added yet.",
  renderLeadingColumns,
  leadingHeaderColumns,
  renderExtraActions,
  minWidthClass = "min-w-[580px]",
}: ApplicationUniversityTargetsTableProps) {
  const router = useRouter();
  const [editingTarget, setEditingTarget] = useState<ApplicationUniversityTargetRow | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [busyTargetId, setBusyTargetId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function refresh() {
    router.refresh();
  }

  function handleEdit(form: UniversityTargetFormState) {
    if (!editingTarget) return;
    setEditError(null);
    startTransition(async () => {
      const result = await actions.updateTarget(editingTarget.id, formToUpdateInput(form));
      if (!result.ok) {
        setEditError(result.error);
        return;
      }
      setEditingTarget(null);
      refresh();
    });
  }

  function handleStatusChange(targetId: string, status: string) {
    setListError(null);
    setBusyTargetId(targetId);
    startTransition(async () => {
      const result = await actions.updateTargetStatus(targetId, status);
      setBusyTargetId(null);
      if (!result.ok) {
        setListError(result.error);
        return;
      }
      refresh();
    });
  }

  function handleDecisionChange(targetId: string, decision: string) {
    setListError(null);
    setBusyTargetId(targetId);
    startTransition(async () => {
      const result = await actions.updateTargetDecision(targetId, decision);
      setBusyTargetId(null);
      if (!result.ok) {
        setListError(result.error);
        return;
      }
      refresh();
    });
  }

  return (
    <>
      {listError ? (
        <p className="border-b border-[#ece9e4] px-5 py-2 text-[12px] text-[#c0392b]">{listError}</p>
      ) : null}

      {targets.length === 0 ? (
        <p className="px-5 py-8 text-center text-[13px] text-[#7a7a7a]">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className={`w-full ${minWidthClass} border-collapse text-left`}>
            <thead>
              <tr className="border-b border-[#ece9e4] text-[11px] font-semibold uppercase tracking-wide text-[#7a7a7a]">
                {leadingHeaderColumns}
                <th className="px-5 py-3">University</th>
                <th className="px-3 py-3">Program</th>
                <th className="px-3 py-3">Deadline</th>
                <th className="px-2 py-3">Status</th>
                <th className="px-2 py-3">Decision</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {targets.map((target) => (
                <tr key={target.id} className="border-b border-[#ece9e4] last:border-b-0">
                  {renderLeadingColumns?.(target)}
                  <td className="px-5 py-3 text-[13px] text-[#4a4a4a]">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px]" aria-hidden>
                        {target.countryFlag}
                      </span>
                      <span className="font-semibold text-[#1a1a1a]">
                        {target.universityName}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[13px] text-[#4a4a4a]">
                    {target.program || "—"}
                  </td>
                  <td className="px-3 py-3 text-[13px] text-[#4a4a4a]">
                    {target.deadlineDisplay}
                  </td>
                  <td className="px-2 py-3">
                    <select
                      value={target.status}
                      disabled={isPending && busyTargetId === target.id}
                      onChange={(event) => handleStatusChange(target.id, event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      className={universityTargetStatusSelectClass}
                      style={{ backgroundImage: UNIVERSITY_TARGET_SELECT_CHEVRON }}
                      aria-label={`Status for ${target.universityName}`}
                    >
                      {UNIVERSITY_TARGET_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-3">
                    <select
                      value={target.decision}
                      disabled={isPending && busyTargetId === target.id}
                      onChange={(event) =>
                        handleDecisionChange(target.id, event.target.value)
                      }
                      onClick={(event) => event.stopPropagation()}
                      className={universityTargetDecisionSelectClass}
                      style={{ backgroundImage: UNIVERSITY_TARGET_SELECT_CHEVRON }}
                      aria-label={`Decision for ${target.universityName}`}
                    >
                      {UNIVERSITY_TARGET_DECISION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {renderExtraActions?.(target)}
                      <button
                        type="button"
                        className={iconBtnClass}
                        disabled={isPending}
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditError(null);
                          setEditingTarget(target);
                        }}
                        aria-label={`Edit ${target.universityName}`}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EditUniversityTargetDialog
        open={editingTarget != null}
        target={editingTarget}
        onClose={() => setEditingTarget(null)}
        onSubmit={handleEdit}
        isSubmitting={isPending}
        error={editError}
        searchUniversities={actions.searchUniversities}
      />
    </>
  );
}
