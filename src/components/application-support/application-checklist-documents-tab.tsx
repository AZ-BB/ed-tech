"use client";

import type { ApplicationChecklistDocumentRow } from "@/lib/application-checklist-mapper";
import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

type ActionResult = { ok: true } | { ok: false; error: string };

export type ApplicationChecklistActions = {
  requestDocument: (documentId: string) => Promise<ActionResult>;
  approveDocument: (documentId: string) => Promise<ActionResult>;
  rejectDocument: (documentId: string) => Promise<ActionResult>;
  markNotApplicable: (documentId: string) => Promise<ActionResult>;
  addDocument: (applicationId: string, displayName: string) => Promise<ActionResult>;
  uploadDocument: (documentId: string, formData: FormData) => Promise<ActionResult>;
};

function statusPillClass(status: ApplicationChecklistDocumentRow["status"]): string {
  switch (status) {
    case "approved":
      return "bg-[rgba(82,183,135,.13)] text-[#1B4332]";
    case "under_review":
      return "bg-[rgba(212,162,42,.14)] text-[#7a5d10]";
    case "requested":
      return "bg-[rgba(52,152,219,.12)] text-[#1d4d70]";
    case "rejected":
      return "bg-[rgba(231,76,60,.12)] text-[#8c2d22]";
    case "not_applicable":
      return "bg-[#ECEAE5] text-[var(--text-mid)]";
    default:
      return "bg-[#ECEAE5] text-[var(--text-mid)]";
  }
}

function iconWrapClass(status: ApplicationChecklistDocumentRow["status"]): string {
  switch (status) {
    case "approved":
      return "bg-[var(--green-bg)] text-[var(--green)]";
    case "under_review":
      return "bg-[rgba(212,162,42,.14)] text-[#D4A22A]";
    case "requested":
      return "bg-[rgba(52,152,219,.12)] text-[#3498DB]";
    case "rejected":
      return "bg-[#FCEBEB] text-[var(--red)]";
    default:
      return "bg-[var(--green-bg)] text-[var(--green)]";
  }
}

const actionBtnClass =
  "inline-flex items-center justify-center rounded-[8px] border-[1.5px] border-[var(--border)] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-mid)] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)] disabled:pointer-events-none disabled:opacity-45";

const primaryBtnClass =
  "inline-flex items-center justify-center rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:opacity-90 disabled:pointer-events-none disabled:opacity-45";

export function ApplicationChecklistDocumentsTab({
  applicationId,
  documents,
  actions,
}: {
  applicationId: number;
  documents: ApplicationChecklistDocumentRow[];
  actions: ApplicationChecklistActions;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);
  const [busyDocId, setBusyDocId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newDocName, setNewDocName] = useState("");
  const [isPending, startTransition] = useTransition();

  function runAction(documentId: string, fn: () => Promise<ActionResult>) {
    setError(null);
    setBusyDocId(documentId);
    startTransition(async () => {
      const result = await fn();
      setBusyDocId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function triggerUpload(documentId: string) {
    setUploadTargetId(documentId);
    fileInputRef.current?.click();
  }

  async function onFilePicked(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const documentId = uploadTargetId;
    event.target.value = "";
    setUploadTargetId(null);
    if (!file || !documentId) return;

    setError(null);
    setBusyDocId(documentId);
    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await actions.uploadDocument(documentId, formData);
      setBusyDocId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleAddDocument() {
    const name = newDocName.trim();
    if (!name) {
      setError("Document name is required.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await actions.addDocument(String(applicationId), name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNewDocName("");
      router.refresh();
    });
  }

  return (
    <SchoolStudentPanel
      head="Documents"
      sub="Request documents from the student, review uploads, and approve or reject."
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(event) => void onFilePicked(event)}
      />

      <div className="flex flex-col gap-2">
        {documents.map((doc) => {
          const isBusy = isPending && busyDocId === doc.id;
          const hasFile = !!doc.url;

          return (
            <div
              key={doc.id}
              className="flex flex-col gap-3 rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-3 sm:flex-row sm:items-center sm:gap-3.5"
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] ${iconWrapClass(doc.status)}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  width={16}
                  height={16}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-[var(--text)]">
                  {doc.displayName}
                </div>
                <div className="mt-0.5 text-[11.5px] text-[var(--text-light)]">
                  {doc.subtitle}
                  {doc.fileName ? ` · ${doc.fileName}` : ""}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusPillClass(doc.status)}`}
                >
                  {doc.statusLabel}
                </span>

                {doc.status === "not_requested" ? (
                  <>
                    <button
                      type="button"
                      disabled={isBusy}
                      className={primaryBtnClass}
                      onClick={() =>
                        runAction(doc.id, () => actions.requestDocument(doc.id))
                      }
                    >
                      Request
                    </button>
                    {doc.allowNotApplicable ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        className={actionBtnClass}
                        onClick={() =>
                          runAction(doc.id, () => actions.markNotApplicable(doc.id))
                        }
                      >
                        Mark N/A
                      </button>
                    ) : null}
                  </>
                ) : null}

                {(doc.status === "requested" ||
                  doc.status === "rejected" ||
                  doc.status === "under_review") && (
                  <button
                    type="button"
                    disabled={isBusy}
                    className={actionBtnClass}
                    onClick={() => triggerUpload(doc.id)}
                  >
                    {hasFile ? "Replace" : "Upload"}
                  </button>
                )}

                {doc.status === "under_review" ? (
                  <>
                    <button
                      type="button"
                      disabled={isBusy}
                      className={primaryBtnClass}
                      onClick={() =>
                        runAction(doc.id, () => actions.approveDocument(doc.id))
                      }
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      className={actionBtnClass}
                      onClick={() =>
                        runAction(doc.id, () => actions.rejectDocument(doc.id))
                      }
                    >
                      Reject
                    </button>
                  </>
                ) : null}

                {hasFile ? (
                  <a
                    href={doc.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={actionBtnClass}
                  >
                    View
                  </a>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-[10px] border border-[var(--border-light)] bg-[rgb(250,249,244)] p-3.5">
        <div className="mb-2 text-[12px] font-semibold text-[var(--text)]">
          Add document
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={newDocName}
            onChange={(event) => {
              setNewDocName(event.target.value);
              setError(null);
            }}
            placeholder="Document name"
            maxLength={200}
            disabled={isPending}
            className="min-w-0 flex-1 rounded-[8px] border-[1.5px] border-[var(--border)] bg-white px-3 py-2 text-[13px] outline-none focus:border-[var(--green-light)] disabled:opacity-60"
          />
          <button
            type="button"
            disabled={isPending || !newDocName.trim()}
            onClick={handleAddDocument}
            className={primaryBtnClass}
          >
            Add document
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-[12px] font-medium text-[#8c2d22]">{error}</p>
      ) : null}
    </SchoolStudentPanel>
  );
}
