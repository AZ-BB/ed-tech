"use client";

import { updateSchoolPredictedDocumentSlot } from "@/actions/school-students";
import { getSchoolMyApplicationDocumentViewUrl } from "@/actions/school-documents";
import type { Database } from "@/database.types";
import { SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY } from "@/app/(protected)/student/my-applications/_lib/my-applications-defaults";
import { createSupabaseBrowserClient } from "@/utils/supabase-browser";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type DocRow = Database["public"]["Tables"]["student_my_application_documents"]["Row"];

const CHECKLIST_STATUS_VALUES = [
  "missing",
  "submitted",
  "needs_review",
  "needs_revision",
  "approved",
  "not_required",
] as const;

type ChecklistStatusValue = (typeof CHECKLIST_STATUS_VALUES)[number];

const CHECKLIST_STATUS_LABEL: Record<ChecklistStatusValue, string> = {
  missing: "Missing",
  submitted: "Uploaded",
  needs_review: "Needs review",
  needs_revision: "Needs revision",
  approved: "Approved",
  not_required: "Not required",
};

function normalizeChecklistStatus(raw: string): ChecklistStatusValue {
  const t = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if ((CHECKLIST_STATUS_VALUES as readonly string[]).includes(t)) {
    return t as ChecklistStatusValue;
  }
  return "missing";
}

function effectiveChecklistStatus(doc: DocRow): ChecklistStatusValue {
  const s = normalizeChecklistStatus(doc.status);
  if (doc.storage_path && s === "missing") return "submitted";
  return s;
}

function checklistRowVisual(label: string): "missing" | "uploaded" | "approved" | "review" | "default" {
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
  "max-w-[200px] cursor-pointer rounded-lg border-[1.5px] border-[var(--border)] bg-white py-1.5 pr-7 pl-2.5 font-[family-name:var(--font-dm-sans)] text-[11.5px] font-medium text-[var(--text-mid)] outline-none focus:border-[var(--green-light)]";

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
}: {
  studentId: string;
  initialDocuments: DocRow[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [documents, setDocuments] = useState<DocRow[]>(initialDocuments);

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
    const res = await updateSchoolPredictedDocumentSlot(studentId, predDraft);
    if ("error" in res) {
      showToast(res.error);
      return;
    }
    showToast("Predicted saved.");
    router.refresh();
  }, [predDraft, router, showToast, studentId]);

  const onChecklistStatusChange = async (doc: DocRow, value: string) => {
    const v = normalizeChecklistStatus(value);
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

  const openDocument = async (doc: DocRow) => {
    if (!doc.storage_path) {
      showToast("No file yet — the student uploads from My applications.");
      return;
    }
    const res = await getSchoolMyApplicationDocumentViewUrl(doc.id);
    if ("error" in res) {
      showToast(res.error);
      return;
    }
    window.open(res.url, "_blank", "noopener,noreferrer");
  };

  const predHasText = !!predDraft.trim();
  const predPillLabel = predHasText ? "Entered" : "Empty";
  const predVisual = predHasText ? "approved" : "missing";
  const predIconClass = iconWrapForVisual(predVisual);

  return (
    <div className="mb-[18px] overflow-hidden rounded-[14px] border border-[var(--border-light)] bg-white">
      <div className="border-b border-[var(--border-light)] px-5 py-[18px]">
        <div className="text-[15px] font-semibold tracking-tight text-[var(--text)]">
          Essays & documents
        </div>
        <div className="mt-0.5 text-[12px] text-[var(--text-light)]">
          Document checklist — change status anytime, click upload to add files
        </div>
      </div>
      <div className="px-5 py-[18px]">
        <div className="flex flex-col gap-2">
          {predictedDoc ? (
            <div className="flex flex-col gap-3 rounded-[10px] border border-[var(--border-light)] bg-[linear-gradient(to_right,rgba(82,183,135,0.04),transparent)] px-3.5 py-3 sm:flex-row sm:items-center sm:gap-3.5">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${predIconClass}`}
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
                    School-only
                  </span>
                </div>
                <div className="mt-0.5 text-[11.5px] text-[var(--text-light)]">
                  {predictedDoc.description?.trim() ||
                    "Text only — students see this as read-only."}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <input
                  value={predDraft}
                  onChange={(e) => setPredDraft(e.target.value)}
                  onBlur={() => void savePredictedText()}
                  placeholder="e.g. 40/45 IB or A*A*A"
                  className="w-full min-w-[160px] rounded-md border-[1.5px] border-[var(--border)] px-2.5 py-1.5 font-[family-name:var(--font-dm-sans)] text-[12px] outline-none focus:border-[var(--green-light)] sm:w-[200px]"
                />
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
            const st = effectiveChecklistStatus(doc);
            const label = CHECKLIST_STATUS_LABEL[st];
            const visual = checklistRowVisual(label);
            const iconCls = iconWrapForVisual(visual);
            const hasFile = !!doc.storage_path;
            const meta = hasFile
              ? `${doc.file_name?.trim() || "File"}${doc.uploaded_at || doc.updated_at ? ` · Updated ${formatUpdated(doc.uploaded_at ?? doc.updated_at)}` : ""}`
              : doc.description?.trim() || "Not uploaded";

            return (
              <div
                key={doc.id}
                className="flex flex-col gap-3 rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-3 sm:flex-row sm:items-center sm:gap-3.5"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconCls}`}
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
                  <select
                    className={selectSmClass}
                    value={st}
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
                  <button
                    type="button"
                    title={
                      hasFile
                        ? "View file"
                        : "Student uploads from My applications"
                    }
                    onClick={() => void openDocument(doc)}
                    className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg border-[1.5px] border-[var(--border)] bg-white text-[var(--text-mid)] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)] disabled:pointer-events-none disabled:opacity-45"
                    disabled={!hasFile}
                  >
                    {hasFile ? (
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
                    ) : (
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
                    )}
                  </button>
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
