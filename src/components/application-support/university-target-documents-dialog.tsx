"use client";

import type { ApplicationChecklistDocumentRow } from "@/lib/application-checklist-mapper";
import {
  UNIVERSITY_DOC_REQUIREMENT_STATUS_OPTIONS,
  UNIVERSITY_DOC_REQUIREMENT_STATUS_LABEL,
} from "@/lib/application-university-target-constants";
import type { ApplicationUniversityTargetRow } from "@/lib/application-university-target-mapper";
import { useRef, useState } from "react";

import {
  UNIVERSITY_DIALOG_SELECT_CHEVRON,
  UniversityTargetDialogShell,
  universityDialogLabelClassName,
  universityDialogSelectClassName,
} from "@/components/application-support/university-target-dialog-shared";

type UniversityTargetDocumentsDialogProps = {
  open: boolean;
  target: ApplicationUniversityTargetRow | null;
  checklistDocuments: ApplicationChecklistDocumentRow[];
  onClose: () => void;
  isSubmitting: boolean;
  error: string | null;
  onUpdateStatus: (requirementId: string, status: string) => void;
  onUpload: (requirementId: string, file: File) => void;
  onLinkChecklist: (requirementId: string, checklistDocumentId: string) => void;
  onClearFile: (requirementId: string) => void;
};

const actionBtnClass =
  "inline-flex cursor-pointer items-center justify-center rounded-[8px] border border-[#e0deda] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#4a4a4a] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] disabled:cursor-not-allowed disabled:opacity-45";

export function UniversityTargetDocumentsDialog({
  open,
  target,
  checklistDocuments,
  onClose,
  isSubmitting,
  error,
  onUpdateStatus,
  onUpload,
  onLinkChecklist,
  onClearFile,
}: UniversityTargetDocumentsDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);

  const linkableChecklistDocs = checklistDocuments.filter((doc) => doc.url?.trim());

  function triggerUpload(requirementId: string) {
    setUploadTargetId(requirementId);
    fileInputRef.current?.click();
  }

  function onFilePicked(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const requirementId = uploadTargetId;
    event.target.value = "";
    setUploadTargetId(null);
    if (!file || !requirementId) return;
    onUpload(requirementId, file);
  }

  return (
    <UniversityTargetDialogShell
      open={open}
      title="University documents"
      subtitle={target?.universityName}
      onClose={onClose}
      isSubmitting={isSubmitting}
      error={error}
      maxWidthClass="max-w-[780px]"
      footer={
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onClose}
          className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[13px] font-semibold text-[#4a4a4a] hover:bg-[#f5f4f0] disabled:opacity-60"
        >
          Close
        </button>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={onFilePicked}
        disabled={isSubmitting}
      />

      {!target || target.requirements.length === 0 ? (
        <p className="text-[13px] text-[#7a7a7a]">
          No document requirements were added for this university.
        </p>
      ) : (
        <div className="space-y-4">
          {target.requirements.map((requirement) => (
            <div
              key={requirement.id}
              className="rounded-[10px] border border-[#ece9e4] bg-[#faf9f7] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[#1a1a1a]">
                    {requirement.displayName}
                  </p>
                  {requirement.file?.fileName ? (
                    <p className="mt-1 truncate text-[12px] text-[#7a7a7a]">
                      {requirement.file.sourceType === "checklist_link"
                        ? `Linked from Documents tab: ${requirement.file.fileName}`
                        : requirement.file.fileName}
                    </p>
                  ) : (
                    <p className="mt-1 text-[12px] text-[#7a7a7a]">No file attached</p>
                  )}
                </div>

                <div className="w-full min-w-[150px] sm:w-auto">
                  <label className={universityDialogLabelClassName}>Status</label>
                  <select
                    value={requirement.status}
                    onChange={(event) => onUpdateStatus(requirement.id, event.target.value)}
                    disabled={isSubmitting}
                    className={universityDialogSelectClassName}
                    style={{ backgroundImage: UNIVERSITY_DIALOG_SELECT_CHEVRON }}
                  >
                    {UNIVERSITY_DOC_REQUIREMENT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {UNIVERSITY_DOC_REQUIREMENT_STATUS_LABEL[option.value]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={actionBtnClass}
                    disabled={isSubmitting}
                    onClick={() => triggerUpload(requirement.id)}
                  >
                    Upload file
                  </button>

                  {requirement.file ? (
                    <button
                      type="button"
                      className={actionBtnClass}
                      disabled={isSubmitting}
                      onClick={() => onClearFile(requirement.id)}
                    >
                      Remove attachment
                    </button>
                  ) : null}
                </div>

                {linkableChecklistDocs.length > 0 ? (
                  <div>
                    <label
                      htmlFor={`checklist-doc-${requirement.id}`}
                      className={universityDialogLabelClassName}
                    >
                      From Documents tab
                    </label>
                    <select
                      id={`checklist-doc-${requirement.id}`}
                      value={
                        requirement.file?.sourceType === "checklist_link"
                          ? (requirement.file.checklistDocumentId ?? "")
                          : ""
                      }
                      disabled={isSubmitting}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (!value) {
                          if (requirement.file?.sourceType === "checklist_link") {
                            onClearFile(requirement.id);
                          }
                          return;
                        }
                        onLinkChecklist(requirement.id, value);
                      }}
                      className={universityDialogSelectClassName}
                      style={{ backgroundImage: UNIVERSITY_DIALOG_SELECT_CHEVRON }}
                    >
                      <option value="">— Select uploaded document —</option>
                      {linkableChecklistDocs.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.displayName}
                          {doc.fileName ? ` (${doc.fileName})` : ""}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-[#7a7a7a]">
                      Reuse a file already uploaded in the application Documents tab.
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-[#7a7a7a]">
                    No uploaded documents in the Documents tab yet. Upload there first, or
                    upload a file above.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </UniversityTargetDialogShell>
  );
}
