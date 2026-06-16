"use client";

import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";
import { AddUniversityTargetDialog } from "@/components/application-support/add-university-target-dialog";
import { EditUniversityTargetDialog } from "@/components/application-support/edit-university-target-dialog";
import { UniversityTargetDocumentsDialog } from "@/components/application-support/university-target-documents-dialog";
import type { UniversityTargetFormState } from "@/components/application-support/university-target-dialog-shared";
import type { ApplicationChecklistDocumentRow } from "@/lib/application-checklist-mapper";
import {
  UNIVERSITY_TARGET_DECISION_OPTIONS,
  UNIVERSITY_TARGET_STATUS_OPTIONS,
} from "@/lib/application-university-target-constants";
import type { ApplicationUniversityTargetRow } from "@/lib/application-university-target-mapper";
import type { UniversityCatalogSearchResult } from "@/lib/search-universities-catalog";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ActionResult = { ok: true } | { ok: false; error: string };

export type ApplicationUniversityTargetsActions = {
  searchUniversities: (
    query: string,
  ) => Promise<
    | { ok: true; results: UniversityCatalogSearchResult[] }
    | { ok: false; error: string }
  >;
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
      documentNames: string[];
    },
  ) => Promise<ActionResult>;
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
  updateDocRequirementStatus: (requirementId: string, status: string) => Promise<ActionResult>;
  uploadDocRequirement: (requirementId: string, formData: FormData) => Promise<ActionResult>;
  linkDocRequirementToChecklist: (
    requirementId: string,
    checklistDocumentId: string,
  ) => Promise<ActionResult>;
  clearDocRequirementFile: (requirementId: string) => Promise<ActionResult>;
};

type ApplicationUniversityTargetsTabProps = {
  applicationId: number;
  targets: ApplicationUniversityTargetRow[];
  checklistDocuments: ApplicationChecklistDocumentRow[];
  universitiesTotal: number;
  actions: ApplicationUniversityTargetsActions;
};

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

const statusSelectClass =
  "min-w-[150px] cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_8px_center] bg-no-repeat py-1.5 pl-2.5 pr-8 text-[12px] text-[#1a1a1a] outline-none transition-colors focus:border-[#40916C] disabled:cursor-not-allowed disabled:opacity-60";

const iconBtnClass =
  "inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[8px] border border-[#e0deda] bg-white text-[#4a4a4a] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] disabled:cursor-not-allowed disabled:opacity-45";

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
    documentNames: form.documentNames.map((name) => name.trim()).filter(Boolean),
  };
}

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

export function ApplicationUniversityTargetsTab({
  applicationId,
  targets,
  checklistDocuments,
  universitiesTotal,
  actions,
}: ApplicationUniversityTargetsTabProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<ApplicationUniversityTargetRow | null>(null);
  const [documentsTarget, setDocumentsTarget] = useState<ApplicationUniversityTargetRow | null>(
    null,
  );
  const [listError, setListError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [busyTargetId, setBusyTargetId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const atPlanLimit = universitiesTotal > 0 && targets.length >= universitiesTotal;

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

  function handleEdit(form: UniversityTargetFormState) {
    if (!editingTarget) return;
    setEditError(null);
    startTransition(async () => {
      const result = await actions.updateTarget(
        editingTarget.id,
        formToUpdateInput(form),
      );
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

  function handleDocStatus(requirementId: string, status: string) {
    setDocsError(null);
    startTransition(async () => {
      const result = await actions.updateDocRequirementStatus(requirementId, status);
      if (!result.ok) {
        setDocsError(result.error);
        return;
      }
      refresh();
    });
  }

  function handleDocUpload(requirementId: string, file: File) {
    setDocsError(null);
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await actions.uploadDocRequirement(requirementId, formData);
      if (!result.ok) {
        setDocsError(result.error);
        return;
      }
      refresh();
    });
  }

  function handleDocLink(requirementId: string, checklistDocumentId: string) {
    setDocsError(null);
    startTransition(async () => {
      const result = await actions.linkDocRequirementToChecklist(
        requirementId,
        checklistDocumentId,
      );
      if (!result.ok) {
        setDocsError(result.error);
        return;
      }
      refresh();
    });
  }

  function handleDocClear(requirementId: string) {
    setDocsError(null);
    startTransition(async () => {
      const result = await actions.clearDocRequirementFile(requirementId);
      if (!result.ok) {
        setDocsError(result.error);
        return;
      }
      refresh();
    });
  }

  const documentsTargetLive =
    documentsTarget != null
      ? (targets.find((target) => target.id === documentsTarget.id) ?? documentsTarget)
      : null;

  return (
    <SchoolStudentPanel head="Universities" sub="Track university applications for this case">
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

        {listError ? (
          <p className="border-b border-[#ece9e4] px-5 py-2 text-[12px] text-[#c0392b]">{listError}</p>
        ) : null}

        {targets.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-[#7a7a7a]">
            No universities added yet. Use Add university to start the shortlist.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#ece9e4] text-[11px] font-semibold uppercase tracking-wide text-[#7a7a7a]">
                  <th className="px-5 py-3">University</th>
                  <th className="px-3 py-3">Program</th>
                  <th className="px-3 py-3">Deadline</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Documents</th>
                  <th className="px-3 py-3">Decision</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {targets.map((target) => (
                  <tr key={target.id} className="border-b border-[#ece9e4] last:border-b-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[16px]" aria-hidden>
                          {target.countryFlag}
                        </span>
                        <span className="text-[13px] font-semibold text-[#1a1a1a]">
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
                    <td className="px-3 py-3">
                      <select
                        value={target.status}
                        disabled={isPending && busyTargetId === target.id}
                        onChange={(event) => handleStatusChange(target.id, event.target.value)}
                        className={statusSelectClass}
                        style={{ backgroundImage: SELECT_CHEVRON }}
                        aria-label={`Status for ${target.universityName}`}
                      >
                        {UNIVERSITY_TARGET_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-[13px] text-[#4a4a4a]">
                      {target.documentsSummary}
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={target.decision}
                        disabled={isPending && busyTargetId === target.id}
                        onChange={(event) =>
                          handleDecisionChange(target.id, event.target.value)
                        }
                        className={statusSelectClass}
                        style={{ backgroundImage: SELECT_CHEVRON }}
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
                        <button
                          type="button"
                          className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#4a4a4a] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] disabled:opacity-45"
                          disabled={isPending}
                          onClick={() => {
                            setDocsError(null);
                            setDocumentsTarget(target);
                          }}
                        >
                          Documents
                        </button>
                        <button
                          type="button"
                          className={iconBtnClass}
                          disabled={isPending}
                          onClick={() => {
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
      </div>

      <AddUniversityTargetDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={isPending}
        error={addError}
        searchUniversities={actions.searchUniversities}
      />

      <EditUniversityTargetDialog
        open={editingTarget != null}
        target={editingTarget}
        onClose={() => setEditingTarget(null)}
        onSubmit={handleEdit}
        isSubmitting={isPending}
        error={editError}
        searchUniversities={actions.searchUniversities}
      />

      <UniversityTargetDocumentsDialog
        open={documentsTarget != null}
        target={documentsTargetLive}
        checklistDocuments={checklistDocuments}
        onClose={() => setDocumentsTarget(null)}
        isSubmitting={isPending}
        error={docsError}
        onUpdateStatus={handleDocStatus}
        onUpload={handleDocUpload}
        onLinkChecklist={handleDocLink}
        onClearFile={handleDocClear}
      />
    </SchoolStudentPanel>
  );
}
