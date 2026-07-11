"use client";

import {
  removeAdminStudentDocument,
  sendAdminDocumentReminder,
  updateAdminPredictedDocumentSlot,
  updateAdminStudentDocumentStatus,
} from "@/actions/admin-documents";
import {
  removeAdvisorStudentDocument,
  sendAdvisorDocumentReminder,
  updateAdvisorPredictedDocumentSlot,
  updateAdvisorStudentDocumentStatus,
} from "@/actions/advisor-documents";
import { adminStudentDocumentViewPath } from "@/lib/admin-student-document-view-path";
import { advisorStudentDocumentViewPath } from "@/lib/advisor-student-document-view-path";
import { uploadAdminStudentDocumentViaApi } from "@/lib/admin-student-document-upload-client";
import { uploadAdvisorStudentDocumentViaApi } from "@/lib/advisor-student-document-upload-client";
import { getSchoolMyApplicationDocumentViewUrl, sendSchoolDocumentReminder } from "@/actions/school-documents";
import { updateSchoolPredictedDocumentSlot } from "@/actions/school-students";
import { AdminControl } from "@/app/(protected)/admin/_components/admin-control";
import {
  isOtherDocumentSlot,
  SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY,
} from "@/app/(protected)/student/my-applications/_lib/my-applications-defaults";
import type { Database } from "@/database.types";
import {
  CHECKLIST_STATUS_LABEL,
  CHECKLIST_STATUS_VALUES,
  effectiveChecklistStatus,
  normalizeChecklistStatus,
} from "@/lib/student-application-document-status";
import { shouldShowDocumentRequestButton } from "@/lib/student-document-reminder";
import { createSupabaseBrowserClient } from "@/utils/supabase-browser";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type DocRow =
  Database["public"]["Tables"]["student_my_application_documents"]["Row"];

function checklistRowVisual(
  label: string,
): "missing" | "uploaded" | "approved" | "review" | "default" {
  if (label === "Missing") return "missing";
  if (label === "Uploaded" || label === "Needs review") return "uploaded";
  if (label === "Approved") return "approved";
  if (label === "Needs revision") return "review";
  return "default";
}

function checklistPillClass(label: string): string {
  if (label === "Approved") {
    return "bg-[rgba(82,183,135,.13)] text-[#1B4332] [&_.sd-pill-dot]:bg-[var(--green-bright)]";
  }
  if (label === "Uploaded") {
    return "bg-[rgba(52,152,219,.12)] text-[#1d4d70] [&_.sd-pill-dot]:bg-[#3498DB]";
  }
  if (label === "Needs review" || label === "Needs revision") {
    return "bg-[rgba(212,162,42,.14)] text-[#7a5d10] [&_.sd-pill-dot]:bg-[#D4A22A]";
  }
  if (label === "Missing") {
    return "bg-[rgba(231,76,60,.12)] text-[#8c2d22] [&_.sd-pill-dot]:bg-[#E74C3C]";
  }
  return "bg-[#ECEAE5] text-[var(--text-mid)] [&_.sd-pill-dot]:bg-[#a0a0a0]";
}

function iconWrapForVisual(
  v: "missing" | "uploaded" | "approved" | "review" | "default",
): string {
  if (v === "missing") return "bg-[#FCEBEB] text-[var(--red)]";
  if (v === "uploaded") return "bg-[rgba(52,152,219,.12)] text-[#3498DB]";
  if (v === "approved") return "bg-[var(--green-bg)] text-[var(--green)]";
  if (v === "review") return "bg-[rgba(212,162,42,.14)] text-[#D4A22A]";
  return "bg-[var(--green-bg)] text-[var(--green)]";
}

const selectSmClass =
  "max-w-[200px] cursor-pointer rounded-[8px] border-[1.5px] border-[var(--border)] bg-white py-1.5 pr-7 pl-2.5 font-[family-name:var(--font-dm-sans)] text-[11.5px] font-medium text-[var(--text-mid)] outline-none focus:border-[var(--green-light)]";

const actionBtnClass =
  "inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] border-[1.5px] border-[var(--border)] bg-white text-[var(--text-mid)] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)] disabled:pointer-events-none disabled:opacity-45";

const requestDocBtnClass =
  "inline-flex shrink-0 cursor-pointer items-center rounded-[8px] border-[1.5px] border-[var(--border)] bg-white px-2.5 py-1 font-[family-name:var(--font-dm-sans)] text-[11px] font-semibold text-[var(--text-mid)] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)] disabled:pointer-events-none disabled:opacity-45";

function formatUpdated(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

export function SchoolStudentDocumentsTab({
  studentId,
  initialDocuments,
  portal = "school",
  canEditDocuments: canEditDocumentsProp,
}: {
  studentId: string;
  initialDocuments: DocRow[];
  portal?: "school" | "admin" | "advisor";
  /** Required when `portal="admin"` — set from `AdminStudentDocumentsTab`. */
  canEditDocuments?: boolean;
}) {
  const isAdminPortal = portal === "admin";
  const isAdvisorPortal = portal === "advisor";
  const isManagePortal = isAdminPortal || isAdvisorPortal;
  const canEditDocuments = isAdvisorPortal
    ? true
    : isAdminPortal
      ? (canEditDocumentsProp ?? false)
      : true;
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [documents, setDocuments] = useState<DocRow[]>(initialDocuments);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);
  const [busyDocId, setBusyDocId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const predictedDoc = useMemo(
    () =>
      documents.find((d) => d.slot_key === SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY),
    [documents],
  );
  const fileDocuments = useMemo(
    () =>
      documents.filter(
        (d) => d.slot_key !== SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY,
      ),
    [documents],
  );

  const [predDraft, setPredDraft] = useState(
    () => predictedDoc?.school_text_value?.trim() ?? "",
  );
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setDocuments(initialDocuments);
  }, [initialDocuments]);

  useEffect(() => {
    const d = initialDocuments.find(
      (x) => x.slot_key === SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY,
    );
    setPredDraft(d?.school_text_value?.trim() ?? "");
  }, [initialDocuments]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const savePredictedText = useCallback(async () => {
    if (isAdminPortal) {
      if (!canEditDocuments) return;
      const res = await updateAdminPredictedDocumentSlot(studentId, predDraft);
      if ("error" in res) {
        showToast(res.error);
        return;
      }
    } else if (isAdvisorPortal) {
      const res = await updateAdvisorPredictedDocumentSlot(studentId, predDraft);
      if ("error" in res) {
        showToast(res.error);
        return;
      }
    } else {
      const res = await updateSchoolPredictedDocumentSlot(studentId, predDraft);
      if ("error" in res) {
        showToast(res.error);
        return;
      }
    }
    showToast("Predicted saved.");
    router.refresh();
  }, [
    canEditDocuments,
    isAdminPortal,
    isAdvisorPortal,
    predDraft,
    router,
    showToast,
    studentId,
  ]);

  const onChecklistStatusChange = async (doc: DocRow, value: string) => {
    const v = normalizeChecklistStatus(value);
    if (isAdminPortal) {
      const res = await updateAdminStudentDocumentStatus(doc.id, v);
      if (!res.ok) {
        showToast(res.error);
        return;
      }
      const now = new Date().toISOString();
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id ? { ...d, status: v, updated_at: now } : d,
        ),
      );
      router.refresh();
      return;
    }

    if (isAdvisorPortal) {
      const res = await updateAdvisorStudentDocumentStatus(doc.id, v);
      if (!res.ok) {
        showToast(res.error);
        return;
      }
      const now = new Date().toISOString();
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id ? { ...d, status: v, updated_at: now } : d,
        ),
      );
      router.refresh();
      return;
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("student_my_application_documents")
      .update({ status: v, updated_at: now })
      .eq("id", doc.id)
      .select("*")
      .single();

    if (error || !data) {
      showToast(error?.message ?? "Could not update status.");
      return;
    }
    setDocuments((prev) => prev.map((d) => (d.id === doc.id ? data : d)));
    router.refresh();
  };

  const openDocument = (doc: DocRow) => {
    if (!doc.storage_path) {
      showToast(
        isManagePortal
          ? "No file uploaded yet."
          : "No file yet — the student uploads from My applications.",
      );
      return;
    }
    if (isAdminPortal) {
      window.open(
        adminStudentDocumentViewPath(doc.id),
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }
    if (isAdvisorPortal) {
      window.open(
        advisorStudentDocumentViewPath(doc.id),
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }
    void (async () => {
      const res = await getSchoolMyApplicationDocumentViewUrl(doc.id);
      if ("error" in res) {
        showToast(res.error);
        return;
      }
      window.open(res.url, "_blank", "noopener,noreferrer");
    })();
  };

  const triggerUpload = (doc: DocRow) => {
    if (!canEditDocuments) return;
    setUploadTargetId(doc.id);
    fileInputRef.current?.click();
  };

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const docId = uploadTargetId;
    e.target.value = "";
    setUploadTargetId(null);
    if (!file || !docId) return;

    setBusyDocId(docId);
    try {
      const res = isAdvisorPortal
        ? await uploadAdvisorStudentDocumentViaApi(docId, file)
        : await uploadAdminStudentDocumentViaApi(docId, file);
      if (!res.ok) {
        showToast(res.error);
        return;
      }
      showToast("File uploaded.");
      router.refresh();
    } finally {
      setBusyDocId(null);
    }
  };

  const onRequestDocument = async (doc: DocRow) => {
    setBusyDocId(doc.id);
    try {
      const res = isAdminPortal
        ? await sendAdminDocumentReminder(doc.id)
        : isAdvisorPortal
          ? await sendAdvisorDocumentReminder(doc.id)
          : await sendSchoolDocumentReminder(doc.id);
      if ("error" in res) {
        showToast(res.error);
        return;
      }
      showToast("Reminder email sent.");
    } finally {
      setBusyDocId(null);
    }
  };

  const onRemoveFile = async (doc: DocRow) => {
    if (!canEditDocuments) return;
    if (
      !window.confirm(
        `Remove the uploaded file for "${doc.display_name}"? The document row will stay on the checklist.`,
      )
    ) {
      return;
    }
    setBusyDocId(doc.id);
    try {
      const res = isAdvisorPortal
        ? await removeAdvisorStudentDocument(doc.id)
        : await removeAdminStudentDocument(doc.id);
      if (!res.ok) {
        showToast(res.error);
        return;
      }
      const now = new Date().toISOString();
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id
            ? {
                ...d,
                storage_path: null,
                file_name: null,
                uploaded_at: null,
                status: "missing",
                updated_at: now,
              }
            : d,
        ),
      );
      showToast("Uploaded file removed.");
      router.refresh();
    } finally {
      setBusyDocId(null);
    }
  };

  const predHasText = !!predDraft.trim();
  const predPillLabel = predHasText ? "Entered" : "Empty";
  const predVisual = predHasText ? "approved" : "missing";
  const predIconClass = iconWrapForVisual(predVisual);

  const headerSubtitle = isManagePortal
    ? canEditDocuments
      ? "Upload files on behalf of the student, change status, or remove uploaded files."
      : "View document checklist and uploaded files."
    : "Document checklist — change status anytime, click upload to add files";

  const predictedInput = (
    <input
      value={predDraft}
      onChange={(e) => setPredDraft(e.target.value)}
      onBlur={() => void savePredictedText()}
      readOnly={isManagePortal && !canEditDocuments}
      placeholder="e.g. 40/45 IB or A*A*A"
      className="w-full min-w-[160px] rounded-[8px] border-[1.5px] border-[var(--border)] px-2.5 py-1.5 font-[family-name:var(--font-dm-sans)] text-[12px] outline-none focus:border-[var(--green-light)] sm:w-[200px] disabled:bg-[#f8f8f6]"
    />
  );

  return (
    <div className="mb-[18px] min-w-0 overflow-hidden rounded-[14px] border border-[var(--border-light)] bg-white">
      {isManagePortal ? (
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => void onFilePicked(e)}
        />
      ) : null}
      <div className="border-b border-[var(--border-light)] px-5 py-[18px]">
        <div className="text-[15px] font-semibold tracking-tight text-[var(--text)]">
          Documents
        </div>
        <div className="mt-0.5 text-[12px] text-[var(--text-light)]">
          {headerSubtitle}
        </div>
      </div>
      <div className="min-w-0 px-5 py-[18px]">
        <div className="flex flex-col gap-2">
          {predictedDoc ? (
            <div className="flex flex-col gap-3 rounded-[10px] border border-[var(--border-light)] bg-[linear-gradient(to_right,rgba(82,183,135,0.04),transparent)] px-3.5 py-3 sm:flex-row sm:items-center sm:gap-3.5">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] ${predIconClass}`}
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
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-[var(--text)]">
                  {predictedDoc.display_name}{" "}
                  <span className="ml-1 inline-flex items-center rounded-[20px] border border-[var(--border)] bg-transparent px-1.5 py-px align-middle text-[10px] font-semibold whitespace-nowrap text-[var(--text-mid)] leading-snug">
                    {isManagePortal ? "Text only" : "School-only"}
                  </span>
                </div>
                <div className="mt-0.5 text-[11.5px] text-[var(--text-light)]">
                  {predictedDoc.description?.trim() ||
                    "Text only — students see this as read-only."}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                {isManagePortal ? (
                  canEditDocuments ? (
                    isAdminPortal ? (
                      <AdminControl permission="edit_documents">
                        {predictedInput}
                      </AdminControl>
                    ) : (
                      predictedInput
                    )
                  ) : (
                    <span className="min-w-[160px] text-[12px] text-[var(--text)] sm:w-[200px]">
                      {predDraft.trim() || "—"}
                    </span>
                  )
                ) : (
                  predictedInput
                )}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold leading-snug ${checklistPillClass(predPillLabel === "Entered" ? "Approved" : "Missing")}`}
                >
                  <span className="sd-pill-dot h-1.5 w-1.5 rounded-full" />
                  {predPillLabel}
                </span>
              </div>
            </div>
          ) : null}

          {fileDocuments.map((doc) => {
            const st = effectiveChecklistStatus(doc.status, doc.storage_path);
            const label = CHECKLIST_STATUS_LABEL[st];
            const visual = checklistRowVisual(label);
            const iconCls = iconWrapForVisual(visual);
            const hasFile = !!doc.storage_path;
            const isBusy = busyDocId === doc.id;
            const showRequestButton = shouldShowDocumentRequestButton(
              doc.status,
              doc.storage_path,
            );
            const showSlotDescription =
              !!doc.description?.trim() &&
              !(
                isOtherDocumentSlot(doc.slot_key) &&
                doc.display_name.trim() !== "Other"
              );
            const meta = hasFile
              ? `${doc.file_name?.trim() || "File"}${doc.uploaded_at || doc.updated_at ? ` · Updated ${formatUpdated(doc.uploaded_at ?? doc.updated_at)}` : ""}`
              : showSlotDescription
                ? doc.description!.trim()
                : "Not uploaded";

            const statusSelect = (
              <select
                className={selectSmClass}
                value={st}
                disabled={isBusy}
                onChange={(e) =>
                  void onChecklistStatusChange(doc, e.target.value)
                }
              >
                {CHECKLIST_STATUS_VALUES.map((key) => (
                  <option key={key} value={key}>
                    {CHECKLIST_STATUS_LABEL[key]}
                  </option>
                ))}
              </select>
            );

            const uploadBtn = isManagePortal && canEditDocuments ? (
              <button
                type="button"
                title={hasFile ? "Replace file" : "Upload file"}
                disabled={isBusy}
                onClick={() => triggerUpload(doc)}
                className={actionBtnClass}
              >
                <svg
                  viewBox="0 0 24 24"
                  width={14}
                  height={14}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
              </button>
            ) : null;

            const removeBtn =
              isManagePortal && canEditDocuments && hasFile ? (
                <button
                  type="button"
                  title="Remove file"
                  disabled={isBusy}
                  onClick={() => void onRemoveFile(doc)}
                  className={`${actionBtnClass} hover:border-[#e8b4b0] hover:bg-[#fcebeb] hover:text-[var(--red)]`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width={14}
                    height={14}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              ) : null;

            return (
              <div
                key={doc.id}
                className="flex flex-col gap-3 rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-3 sm:flex-row sm:items-center sm:gap-3.5"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] ${iconCls}`}
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
                    {doc.display_name}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-[var(--text-light)]">
                    {meta}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold leading-snug ${checklistPillClass(label)}`}
                  >
                    <span className="sd-pill-dot h-1.5 w-1.5 rounded-full" />
                    {label}
                  </span>
                  {isManagePortal ? (
                    canEditDocuments ? (
                      isAdminPortal ? (
                        <AdminControl permission="edit_documents">
                          {statusSelect}
                          {uploadBtn}
                          {removeBtn}
                        </AdminControl>
                      ) : (
                        <>
                          {statusSelect}
                          {uploadBtn}
                          {removeBtn}
                        </>
                      )
                    ) : null
                  ) : (
                    statusSelect
                  )}
                  {showRequestButton ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void onRequestDocument(doc)}
                      className={requestDocBtnClass}
                    >
                      Request document
                    </button>
                  ) : null}
                  {hasFile ? (
                    <button
                      type="button"
                      title="View file"
                      onClick={() => void openDocument(doc)}
                      className={actionBtnClass}
                      disabled={isBusy}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width={14}
                        height={14}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {toast ? (
        <div className="pointer-events-none fixed bottom-6 right-6 z-[200] rounded-[10px] bg-[var(--green-dark)] px-[18px] py-3 font-[family-name:var(--font-dm-sans)] text-[13px] font-medium text-white shadow-[0_12px_32px_rgba(15,30,20,.08)]">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
