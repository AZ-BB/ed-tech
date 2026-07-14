"use client";

import {
  createStudentUniversityTarget,
  searchStudentUniversitiesForApplication,
  toggleStudentApplicationTask,
} from "@/actions/student-application-support";
import { AddUniversityTargetDialog } from "@/components/application-support/add-university-target-dialog";
import type { UniversityTargetFormState } from "@/components/application-support/university-target-dialog-shared";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import { sortApplicationDocumentsBySlotOrder } from "@/lib/ensure-student-application-documents";
import {
  isApplicationTaskOverdue,
  type ApplicationTaskPriority,
} from "@/lib/application-task-constants";
import { useLocale } from "@/lib/i18n/locale-context";
import { createSupabaseBrowserClient } from "@/utils/supabase-browser";
import type { Database } from "@/database.types";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useId, useMemo, useState, useTransition } from "react";

import {
  SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY,
  isOtherDocumentSlot,
  makeSupplementalOtherDocumentSlotKey,
} from "@/app/(protected)/student/my-applications/_lib/my-applications-defaults";

import type { StudentApplicationSupportDashboardPayload } from "../_lib/student-application-support-dashboard-types";

type DocRow =
  Database["public"]["Tables"]["student_my_application_documents"]["Row"];

type TabId = "intake" | "universities" | "documents" | "tasks";

const PANEL_CLASS =
  "mb-3.5 min-w-0 overflow-x-clip rounded-[12px] border border-[var(--border-light)] bg-white sm:rounded-[14px]";
const PANEL_HEAD_CLASS =
  "flex min-w-0 flex-col gap-2.5 border-b border-[var(--border-light)] px-3.5 py-3.5 sm:gap-3 sm:px-5 sm:py-4 md:flex-row md:items-start md:justify-between md:gap-4";
const PANEL_BODY_CLASS = "min-w-0 px-3.5 py-4 sm:px-5 sm:py-[18px]";

function btnSmClass(primary?: boolean) {
  return primary
    ? "inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-[var(--green)] bg-[var(--green)] px-2.5 py-1.5 text-[11.5px] font-semibold text-white hover:bg-[var(--green-dark)]"
    : "inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-[var(--text-mid)] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)]";
}

function CalloutInfo({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3.5 flex gap-2.5 rounded-[10px] border border-[var(--green-bg)] bg-[var(--green-pale)] px-3 py-3 sm:gap-3 sm:px-3.5 sm:py-3.5">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--green)] text-white">
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </div>
      <p className="min-w-0 text-[12px] leading-relaxed text-[var(--green-dark)] sm:text-[12.5px]">
        {children}
      </p>
    </div>
  );
}

function SnapItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[10px] border border-[var(--border-light)] bg-[var(--cream)] px-3 py-2.5 sm:px-3.5 sm:py-3">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)] sm:text-[11px]">
        {label}
      </div>
      <div className="mt-1 break-words whitespace-pre-wrap text-[12.5px] font-medium text-[var(--text)] sm:text-[13px]">
        {value || "—"}
      </div>
    </div>
  );
}

function formatCurriculum(value: string | null): string {
  if (!value) return "—";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(iso: string | null | undefined, locale?: string) {
  if (!iso) return "";
  const dateLocale = locale === "ar" ? "ar" : undefined;
  try {
    return new Date(iso).toLocaleDateString(dateLocale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function parseTab(raw: string | null): TabId {
  if (
    raw === "intake" ||
    raw === "universities" ||
    raw === "documents" ||
    raw === "tasks"
  ) {
    return raw;
  }
  return "intake";
}

function ymdLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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

export function StudentApplicationSupportDashboard({
  initial,
}: {
  initial: StudentApplicationSupportDashboardPayload;
}) {
  const { dict, locale } = useLocale();
  const app = dict.student.applications;
  const d = dict.student.applicationSupport.dashboard;
  const emptyValue = dict.student.settings.emptyValue;
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  function applicationStatusLabel(status: string): string {
    const map = d.applicationStatuses as Record<string, string>;
    return map[status] ?? status;
  }

  function targetStatusLabel(status: string): string {
    const map = d.targetStatuses as Record<string, string>;
    return map[status] ?? status;
  }

  function targetDecisionLabel(decision: string): string {
    const map = d.targetDecisions as Record<string, string>;
    return map[decision] ?? decision;
  }

  function priorityLabel(priority: ApplicationTaskPriority): string {
    if (priority === "high") return app.high;
    if (priority === "medium") return app.medium;
    return app.low;
  }

  function formatTaskDue(dueDate: string | null, completed: boolean): string | null {
    if (completed || !dueDate) return null;
    const due = dueDate.slice(0, 10);
    const today = new Date();
    const todayYmd = ymdLocal(today);
    const todayMs = new Date(`${todayYmd}T12:00:00`).getTime();
    const dueMs = new Date(`${due}T12:00:00`).getTime();
    const diffDays = Math.round((dueMs - todayMs) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      const days = Math.abs(diffDays);
      return days === 1
        ? d.overdueOne
        : d.overdueMany.replace("{count}", String(days));
    }
    if (diffDays === 0) return d.dueToday;
    if (diffDays === 1) return d.dueTomorrow;
    return d.dueInDays.replace("{count}", String(diffDays));
  }

  const [tab, setTab] = useState<TabId>(() => parseTab(searchParams.get("tab")));
  const [toast, setToast] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocRow[]>(initial.documents);
  const [tasks, setTasks] = useState(initial.tasks);
  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);

  useEffect(() => {
    setDocuments(initial.documents);
    setTasks(initial.tasks);
  }, [initial.documents, initial.tasks]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  function showToast(message: string) {
    setToast(message);
  }

  function selectTab(next: TabId) {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "intake") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    router.replace(
      qs ? `/student/application-support?${qs}` : "/student/application-support",
      { scroll: false },
    );
  }

  const missingDocs = documents.filter(
    (d) => d.status === "missing" && !isOtherDocumentSlot(d.slot_key),
  ).length;
  const openTasks = tasks.filter((t) => !t.completed).length;

  const coreDocuments = useMemo(
    () => documents.filter((d) => !isOtherDocumentSlot(d.slot_key)),
    [documents],
  );
  const otherDocuments = useMemo(
    () =>
      sortApplicationDocumentsBySlotOrder(
        documents.filter((d) => isOtherDocumentSlot(d.slot_key)),
      ),
    [documents],
  );

  const atUniLimit =
    initial.universitiesTotal > 0 &&
    initial.universityTargets.length >= initial.universitiesTotal;

  const uploadDocument = async (doc: DocRow, file: File) => {
    if (doc.slot_key === SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY) {
      showToast(app.toasts.schoolReadOnly);
      return;
    }
    const safeName = file.name.replace(/[^\w.\-()+ ]/g, "_");
    const path = `${initial.studentId}/${doc.slot_key}/${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage
      .from("student-my-applications")
      .upload(path, file, { upsert: true });
    if (upErr) {
      showToast(upErr.message);
      return;
    }
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("student_my_application_documents")
      .update({
        storage_path: path,
        file_name: file.name,
        status: "submitted",
        uploaded_at: now,
        updated_at: now,
      })
      .eq("id", doc.id)
      .select("*")
      .single();
    if (error || !data) {
      showToast(error?.message ?? app.toasts.updateFailed);
      return;
    }
    setDocuments((prev) => prev.map((d) => (d.id === doc.id ? data : d)));
    showToast(app.toasts.docUploadedToast.replace("{name}", doc.display_name));
  };

  const saveOtherDocumentDisplayName = async (
    docId: string,
    displayName: string,
  ) => {
    const name = displayName.trim();
    if (!name) {
      showToast(app.toasts.enterDocName);
      return;
    }
    if (name.length > 120) {
      showToast(app.toasts.nameTooLong);
      return;
    }
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("student_my_application_documents")
      .update({ display_name: name, description: null, updated_at: now })
      .eq("id", docId)
      .eq("student_id", initial.studentId)
      .select("*")
      .single();
    if (error || !data) {
      showToast(error?.message ?? app.toasts.couldNotSaveName);
      return;
    }
    setDocuments((prev) =>
      sortApplicationDocumentsBySlotOrder(
        prev.map((d) => (d.id === docId ? data : d)),
      ),
    );
    showToast(app.toasts.docNameSaved);
  };

  const addOtherDocument = async () => {
    const slot_key = makeSupplementalOtherDocumentSlotKey();
    const { data, error } = await supabase
      .from("student_my_application_documents")
      .insert({
        student_id: initial.studentId,
        slot_key,
        display_name: "Other",
        description: null,
        status: "missing",
      })
      .select("*")
      .single();
    if (error || !data) {
      showToast(error?.message ?? app.toasts.couldNotAddDoc);
      return;
    }
    setDocuments((prev) =>
      sortApplicationDocumentsBySlotOrder([...prev, data as DocRow]),
    );
    showToast(app.toasts.addedDocRow);
  };

  const removeOtherDocument = async (doc: DocRow) => {
    if (!isOtherDocumentSlot(doc.slot_key)) return;
    const storagePath = doc.storage_path?.trim();
    const { error } = await supabase
      .from("student_my_application_documents")
      .delete()
      .eq("id", doc.id)
      .eq("student_id", initial.studentId);
    if (error) {
      showToast(error.message ?? app.toasts.couldNotRemoveDoc);
      return;
    }
    if (storagePath) {
      const { error: rmErr } = await supabase.storage
        .from("student-my-applications")
        .remove([storagePath]);
      if (rmErr) {
        console.error("[removeOtherDocument] storage remove", rmErr);
      }
    }
    setDocuments((prev) =>
      sortApplicationDocumentsBySlotOrder(prev.filter((d) => d.id !== doc.id)),
    );
    showToast(app.toasts.docRowRemoved);
  };

  const onAddUniversity = (form: UniversityTargetFormState) => {
    setAddError(null);
    startTransition(async () => {
      const result = await createStudentUniversityTarget(
        String(initial.application.id),
        formToCreateInput(form),
      );
      if (!result.ok) {
        setAddError(result.error);
        return;
      }
      setAddOpen(false);
      showToast(d.universityAddedToast);
      router.refresh();
    });
  };

  const onToggleTask = (taskId: string, completed: boolean) => {
    setTogglingTaskId(taskId);
    startTransition(async () => {
      const previous = tasks;
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completed } : t)),
      );
      const result = await toggleStudentApplicationTask(taskId, completed);
      setTogglingTaskId(null);
      if (!result.ok) {
        setTasks(previous);
        showToast(result.error);
        return;
      }
      router.refresh();
    });
  };

  const { application, plan } = initial;

  return (
    <div className="mx-auto min-w-0 max-w-full overflow-x-clip pb-10 text-[var(--text)] sm:pb-14">
      <div className="mb-4 sm:mb-[18px]">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--green)]">
          {d.workspaceLabel}
        </div>
        <h1 className="font-[family-name:var(--font-dm-serif)] text-[24px] font-bold leading-tight tracking-tight text-[var(--text)] sm:text-[30px]">
          {d.pageTitle}
        </h1>
        <p className="mt-1.5 max-w-[680px] text-[13px] leading-relaxed text-[var(--text-mid)] sm:text-sm">
          {d.pageSubtitle}
        </p>
      </div>

      <div className="relative mb-4 flex flex-col gap-3 overflow-hidden rounded-[12px] bg-gradient-to-br from-[var(--green-dark)] to-[var(--green)] px-4 py-4 text-white sm:mb-[18px] sm:rounded-[14px] sm:px-5 sm:py-5 md:flex-row md:items-center md:gap-[18px]">
        <div className="pointer-events-none absolute -end-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative z-[1] min-w-0 flex-1">
          <div className="font-[family-name:var(--font-dm-serif)] text-base leading-snug sm:text-lg">
            {plan?.name ?? d.fallbackPlanName}
          </div>
          <div className="mt-1 text-[12px] text-white/70 sm:text-[12.5px]">
            {d.statusLine.replace(
              "{status}",
              applicationStatusLabel(application.status),
            )}
            {plan
              ? d.universitiesIncludedLine.replace(
                  "{count}",
                  String(plan.universitiesCount),
                )
              : null}
          </div>
        </div>
        <div className="relative z-[1] text-[12px] text-white/80 sm:text-[12.5px] md:text-end">
          {d.universitiesAddedLine
            .replace("{added}", String(initial.universityTargets.length))
            .replace("{total}", String(initial.universitiesTotal || emptyValue))}
        </div>
      </div>

      <div className="-mx-1 mb-4 flex snap-x snap-mandatory gap-0.5 overflow-x-auto overscroll-x-contain rounded-[10px] border border-[var(--border-light)] bg-white p-1 [scrollbar-width:thin] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-sm [&::-webkit-scrollbar-thumb]:bg-[var(--border)]">
        {(
          [
            ["intake", d.tabs.intake, null],
            [
              "universities",
              d.tabs.universities,
              initial.universityTargets.length > 0
                ? initial.universityTargets.length
                : null,
            ],
            [
              "documents",
              d.tabs.documents,
              missingDocs > 0 ? missingDocs : null,
            ],
            ["tasks", d.tabs.tasks, openTasks > 0 ? openTasks : null],
          ] as const
        ).map(([id, label, badge]) => (
          <button
            key={id}
            type="button"
            onClick={() => selectTab(id)}
            className={`flex min-h-[40px] shrink-0 snap-start touch-manipulation items-center gap-1.5 whitespace-nowrap rounded-[7px] px-3 py-2 text-[12px] font-medium transition-colors sm:min-h-0 sm:px-3.5 sm:text-[12.5px] ${
              tab === id
                ? "bg-[var(--green)] text-white"
                : "text-[var(--text-light)] hover:text-[var(--text)]"
            }`}
          >
            {label}
            {badge != null && badge > 0 ? (
              <span
                className={`rounded-lg px-1.5 py-0.5 text-[10px] font-bold ${
                  tab === id
                    ? "bg-white/25 text-white"
                    : "bg-[#FCEBEB] text-[#8c2d22]"
                }`}
              >
                {badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "intake" ? (
        <div className="animate-[my-apps-fade-in_0.2s_ease] min-w-0">
          <CalloutInfo>{d.intakeHint}</CalloutInfo>

          <div className={PANEL_CLASS}>
            <div className={PANEL_HEAD_CLASS}>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold tracking-tight">
                  {d.intakeTitle}
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-light)]">
                  {d.intakeSub}
                </div>
              </div>
            </div>
            <div className={PANEL_BODY_CLASS}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SnapItem
                  label={d.labels.fullName}
                  value={application.studentName}
                />
                <SnapItem
                  label={d.labels.email}
                  value={application.studentEmail}
                />
                <SnapItem
                  label={d.labels.phone}
                  value={application.studentPhone}
                />
                <SnapItem
                  label={d.labels.school}
                  value={application.schoolName ?? emptyValue}
                />
                <SnapItem
                  label={d.labels.intendedFields}
                  value={application.intendedFields}
                />
                <SnapItem
                  label={d.labels.openToRelatedFields}
                  value={application.openToRelatedFields ? d.yes : d.no}
                />
                <SnapItem
                  label={d.labels.preferredUniOrCountries}
                  value={application.preferredUniOrCountries}
                />
                <SnapItem
                  label={d.labels.curriculum}
                  value={formatCurriculum(application.curriculum)}
                />
                <SnapItem
                  label={d.labels.finalGrade}
                  value={application.finalGrade}
                />
                <SnapItem
                  label={d.labels.expectedGraduationYear}
                  value={
                    application.expectedGraduationYear != null
                      ? String(application.expectedGraduationYear)
                      : emptyValue
                  }
                />
                <SnapItem
                  label={d.labels.gpa}
                  value={
                    application.gpa != null ? String(application.gpa) : emptyValue
                  }
                />
                <SnapItem
                  label={d.labels.sat}
                  value={
                    application.sat != null ? String(application.sat) : emptyValue
                  }
                />
                <SnapItem
                  label={d.labels.act}
                  value={
                    application.act != null ? String(application.act) : emptyValue
                  }
                />
                <SnapItem
                  label={d.labels.ielts}
                  value={
                    application.ielts != null
                      ? String(application.ielts)
                      : emptyValue
                  }
                />
                <SnapItem
                  label={d.labels.toefl}
                  value={
                    application.toefl != null
                      ? String(application.toefl)
                      : emptyValue
                  }
                />
                <SnapItem
                  label={d.labels.extracurricularActivities}
                  value={application.extracurricularActivities}
                />
                <SnapItem
                  label={d.labels.awards}
                  value={application.awards ?? emptyValue}
                />
              </div>

              {application.universities.length > 0 ? (
                <div className="mt-4">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                    {d.labels.targetUniversities}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {application.universities.map((name) => (
                      <span
                        key={name}
                        className="rounded-full bg-[var(--green-pale)] px-2.5 py-1 text-[12px] font-medium text-[var(--green-dark)]"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {application.preferencesUniversitiesNotes ? (
                <div className="mt-4 grid grid-cols-1 gap-3">
                  <SnapItem
                    label={d.labels.universityNotes}
                    value={application.preferencesUniversitiesNotes}
                  />
                </div>
              ) : null}

              {application.additionalNotes ? (
                <div className="mt-4 grid grid-cols-1 gap-3">
                  <SnapItem
                    label={d.labels.additionalNotes}
                    value={application.additionalNotes}
                  />
                </div>
              ) : null}
            </div>
          </div>

          {plan ? (
            <div className={PANEL_CLASS}>
              <div className={PANEL_HEAD_CLASS}>
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold tracking-tight">
                    {d.packageTitle}
                  </div>
                  <div className="mt-0.5 text-xs text-[var(--text-light)]">
                    {d.packageSub}
                  </div>
                </div>
              </div>
              <div className={PANEL_BODY_CLASS}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <SnapItem label={d.labels.planName} value={plan.name} />
                  <SnapItem
                    label={d.labels.universitiesIncluded}
                    value={String(plan.universitiesCount)}
                  />
                  <SnapItem
                    label={d.labels.priceAed}
                    value={plan.price.toLocaleString(locale === "ar" ? "ar" : undefined)}
                  />
                  <SnapItem
                    label={d.labels.description}
                    value={plan.description ?? emptyValue}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "universities" ? (
        <div className="animate-[my-apps-fade-in_0.2s_ease] min-w-0">
          <CalloutInfo>{d.universitiesHint}</CalloutInfo>

          <div className={PANEL_CLASS}>
            <div className={PANEL_HEAD_CLASS}>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold tracking-tight">
                  {d.universitiesTitle}
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-light)]">
                  {d.universitiesCountSub
                    .replace(
                      "{added}",
                      String(initial.universityTargets.length),
                    )
                    .replace(
                      "{total}",
                      String(initial.universitiesTotal || emptyValue),
                    )}
                </div>
              </div>
              <button
                type="button"
                className={`${btnSmClass(true)} w-full shrink-0 self-stretch sm:w-auto sm:self-start`}
                disabled={atUniLimit}
                onClick={() => {
                  setAddError(null);
                  setAddOpen(true);
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {d.addUniversity}
              </button>
            </div>
            <div className={`${PANEL_BODY_CLASS} space-y-2`}>
              {atUniLimit ? (
                <p className="mb-2 text-[12.5px] text-[var(--text-mid)]">
                  {d.uniLimitReached}
                </p>
              ) : null}
              {initial.universityTargets.length === 0 ? (
                <p className="text-sm text-[var(--text-mid)]">
                  {d.noUniversities}
                </p>
              ) : (
                initial.universityTargets.map((target) => {
                  const country =
                    (target.countryCode &&
                      getCountryNameByAlpha2(target.countryCode)) ||
                    target.countryCode ||
                    emptyValue;
                  return (
                    <div
                      key={target.id}
                      className="flex min-w-0 flex-col gap-2 rounded-[10px] border border-[var(--border-light)] bg-white px-3 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-3.5 sm:py-3.5"
                    >
                      <div className="min-w-0">
                        <div className="break-words text-[13.5px] font-semibold text-[var(--text)]">
                          {target.countryFlag ? (
                            <span className="me-1.5" aria-hidden>
                              {target.countryFlag}
                            </span>
                          ) : null}
                          {target.universityName}
                        </div>
                        <div className="mt-1 break-words text-[12px] text-[var(--text-light)]">
                          {[target.program, country]
                            .filter(Boolean)
                            .join(" · ") || emptyValue}
                          {target.deadlineDisplay
                            ? ` · ${d.duePrefix.replace("{date}", target.deadlineDisplay)}`
                            : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center rounded-full bg-[rgba(82,183,135,0.13)] px-2.5 py-[3px] text-[11px] font-semibold text-[#1B4332]">
                          {targetStatusLabel(target.status)}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-[#ECEAE5] px-2.5 py-[3px] text-[11px] font-semibold text-[var(--text-mid)]">
                          {targetDecisionLabel(target.decision)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <AddUniversityTargetDialog
            open={addOpen}
            onClose={() => setAddOpen(false)}
            onSubmit={onAddUniversity}
            isSubmitting={isPending}
            error={addError}
            searchUniversities={searchStudentUniversitiesForApplication}
            labels={{
              ...d.addDialog,
              statusOptionLabels: d.targetStatuses,
            }}
          />
        </div>
      ) : null}

      {tab === "documents" ? (
        <div className="animate-[my-apps-fade-in_0.2s_ease] min-w-0">
          <CalloutInfo>{app.documentsHint}</CalloutInfo>
          <div className={PANEL_CLASS}>
            <div className={PANEL_HEAD_CLASS}>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold tracking-tight">
                  {app.documentChecklist}
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-light)]">
                  {app.documentChecklistSub}
                </div>
              </div>
            </div>
            <div className={`${PANEL_BODY_CLASS} space-y-2`}>
              {coreDocuments.map((d) => (
                <DocumentRow
                  key={d.id}
                  doc={d}
                  locale={locale}
                  onPickFile={(file) => void uploadDocument(d, file)}
                />
              ))}
            </div>
          </div>

          <div className={PANEL_CLASS}>
            <div className={PANEL_HEAD_CLASS}>
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold tracking-tight">
                    {app.otherDocuments}
                  </div>
                  <div className="mt-0.5 text-xs text-[var(--text-light)]">
                    {app.otherDocumentsSub}
                  </div>
                </div>
                <button
                  type="button"
                  className={`${btnSmClass(false)} w-full shrink-0 self-stretch sm:mt-0.5 sm:w-auto sm:self-start`}
                  onClick={() => void addOtherDocument()}
                >
                  {app.addAnotherDocument}
                </button>
              </div>
            </div>
            <div className={`${PANEL_BODY_CLASS} space-y-2`}>
              {otherDocuments.length > 0 ? (
                otherDocuments.map((d) => (
                  <DocumentRow
                    key={d.id}
                    doc={d}
                    locale={locale}
                    onPickFile={(file) => void uploadDocument(d, file)}
                    allowDisplayNameEdit
                    onSaveDisplayName={(name) =>
                      void saveOtherDocumentDisplayName(d.id, name)
                    }
                    allowRemove
                    onRemove={() => void removeOtherDocument(d)}
                  />
                ))
              ) : (
                <p className="text-sm text-[var(--text-mid)]">
                  {app.noOtherDocuments}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "tasks" ? (
        <div className="animate-[my-apps-fade-in_0.2s_ease] min-w-0">
          <CalloutInfo>{d.tasksHint}</CalloutInfo>
          <div className={PANEL_CLASS}>
            <div className={PANEL_HEAD_CLASS}>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold tracking-tight">
                  {d.tasksTitle}
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-light)]">
                  {d.openTasks.replace("{count}", String(openTasks))}
                </div>
              </div>
            </div>
            <div className={`${PANEL_BODY_CLASS} space-y-[7px]`}>
              {tasks.length === 0 ? (
                <p className="text-sm text-[var(--text-mid)]">{d.noTasks}</p>
              ) : (
                tasks.map((task) => {
                  const dueLabel = formatTaskDue(task.dueDate, task.completed);
                  const isOverdue = isApplicationTaskOverdue(
                    task.dueDate,
                    task.completed,
                  );
                  const disabled = isPending && togglingTaskId === task.id;
                  return (
                    <button
                      key={task.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => onToggleTask(task.id, !task.completed)}
                      className={`flex w-full min-w-0 touch-manipulation cursor-pointer items-start gap-3 rounded-[10px] border border-[var(--border-light)] px-3 py-3 text-start transition-colors hover:border-[var(--border)] disabled:opacity-60 sm:px-3.5 ${
                        task.completed ? "bg-[var(--cream)]" : "bg-white"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] ${
                          task.completed
                            ? "border-[var(--green-bright)] bg-[var(--green-bright)]"
                            : "border-[var(--border)] bg-white"
                        }`}
                        aria-hidden
                      >
                        {task.completed ? (
                          <svg
                            className="h-2.5 w-2.5 text-white"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        ) : null}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div
                          className={`break-words text-[13.5px] font-semibold leading-snug text-[var(--text)] ${
                            task.completed
                              ? "text-[var(--text-light)] line-through"
                              : ""
                          }`}
                        >
                          {task.title}
                        </div>
                        {task.completed ? (
                          <div className="mt-0.5 text-[12px] text-[var(--text-hint)]">
                            {d.completed}
                            {task.authorName
                              ? d.assignedBy.replace("{name}", task.authorName)
                              : null}
                          </div>
                        ) : (
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-[var(--text-light)]">
                            {dueLabel ? (
                              <span
                                className={
                                  isOverdue
                                    ? "font-semibold text-[var(--red)]"
                                    : ""
                                }
                              >
                                {dueLabel}
                              </span>
                            ) : null}
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#ECEAE5] px-[7px] py-px text-[10px] font-bold text-[var(--text-mid)]">
                              {priorityLabel(task.priority)}
                            </span>
                            {task.authorName ? (
                              <span>
                                {d.fromAuthor.replace("{name}", task.authorName)}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-[200] w-[max-content] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg bg-[var(--green-dark)] px-4 py-2.5 text-center text-[13px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function DocumentRow({
  doc,
  locale,
  onPickFile,
  allowDisplayNameEdit,
  onSaveDisplayName,
  allowRemove,
  onRemove,
}: {
  doc: DocRow;
  locale: string;
  onPickFile: (f: File) => void;
  allowDisplayNameEdit?: boolean;
  onSaveDisplayName?: (name: string) => void | Promise<void>;
  allowRemove?: boolean;
  onRemove?: () => void | Promise<void>;
}) {
  const { dict } = useLocale();
  const app = dict.student.applications;
  const nameFieldId = useId();
  const [nameDraft, setNameDraft] = useState(doc.display_name);
  useEffect(() => {
    setNameDraft(doc.display_name);
  }, [doc.display_name, doc.id]);

  const slotLabels = app.documentSlotLabels as Record<string, string>;
  const slotDescriptions = app.documentDescriptions as Record<string, string>;
  const displayLabel =
    allowDisplayNameEdit || isOtherDocumentSlot(doc.slot_key)
      ? doc.display_name
      : (slotLabels[doc.slot_key] ?? doc.display_name);
  const descriptionText =
    slotDescriptions[doc.slot_key] ?? doc.description ?? null;

  const docFieldClass =
    "box-border w-full min-w-0 max-w-full rounded-lg border-[1.5px] border-[var(--border)] bg-white px-3 py-2 text-[12px] text-[var(--text)] outline-none focus:border-[var(--green-light)] focus:shadow-[0_0_0_3px_rgba(45,106,79,0.07)]";

  if (doc.slot_key === SCHOOL_TEXT_ONLY_DOCUMENT_SLOT_KEY) {
    const text = doc.school_text_value?.trim();
    const has = !!text;
    return (
      <div className="flex flex-col gap-2 rounded-[10px] border border-[var(--border-light)] bg-[#faf9f4] p-3 md:flex-row md:items-center">
        <div
          className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg ${
            has
              ? "bg-[var(--green-bg)] text-[var(--green)]"
              : "bg-[#ECEAE5] text-[var(--text-mid)]"
          }`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold">{displayLabel}</div>
          <div className="mt-0.5 text-[11.5px] text-[var(--text-light)]">
            {has ? (
              <span className="text-[var(--text)]">{text}</span>
            ) : (
              app.schoolNotEntered
            )}
          </div>
        </div>
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 border-t border-[var(--border-light)] pt-2 md:w-auto md:justify-end md:border-0 md:pt-0">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
              has
                ? "bg-[rgba(82,183,135,.13)] text-[#1B4332]"
                : "bg-[#ECEAE5] text-[var(--text-mid)]"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
            {has ? app.fromSchool : app.pending}
          </span>
          <span
            className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--cream)] px-2.5 py-1.5 text-[11.5px] font-semibold text-[var(--text-hint)]"
            title={app.readOnlyTitle}
          >
            {app.viewOnly}
          </span>
        </div>
      </div>
    );
  }

  const missing = doc.status === "missing";
  return (
    <div className="flex flex-col gap-2 rounded-[10px] border border-[var(--border-light)] bg-white p-3 md:flex-row md:items-center">
      <div
        className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg ${
          missing
            ? "bg-[#FCEBEB] text-[var(--red)]"
            : "bg-[rgba(52,152,219,0.12)] text-[#3498DB]"
        }`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        {allowDisplayNameEdit ? (
          <div className="flex min-w-0 w-full flex-col gap-1">
            <label
              htmlFor={nameFieldId}
              className="block text-[9.5px] font-semibold uppercase tracking-wide text-[var(--text-hint)]"
            >
              {app.nameForCounselor}
            </label>
            <input
              id={nameFieldId}
              className={`${docFieldClass} block w-full min-w-0 py-1.5`}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder={app.docNamePlaceholder}
              maxLength={120}
            />
          </div>
        ) : (
          <div className="text-[13.5px] font-semibold">{displayLabel}</div>
        )}
        <div className="mt-0.5 text-[11.5px] text-[var(--text-light)]">
          {doc.file_name && doc.uploaded_at
            ? app.uploadedFileMeta
                .replace("{fileName}", doc.file_name)
                .replace("{date}", formatDate(doc.uploaded_at, locale))
            : allowDisplayNameEdit
              ? descriptionText || app.documentNotUploadedOther
              : descriptionText || app.documentNotUploaded}
        </div>
      </div>
      <div className="flex w-full shrink-0 flex-wrap items-center justify-start gap-2 border-t border-[var(--border-light)] pt-2 md:w-auto md:justify-end md:border-0 md:pt-0">
        {allowDisplayNameEdit ? (
          <button
            type="button"
            className={`${btnSmClass(false)} flex-1 sm:flex-none`}
            onClick={() => void onSaveDisplayName?.(nameDraft.trim())}
          >
            {app.saveName}
          </button>
        ) : null}
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
            missing
              ? "bg-[rgba(231,76,60,0.12)] text-[#8c2d22]"
              : "bg-[rgba(52,152,219,0.12)] text-[#1d4d70]"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
          {missing ? app.missing : app.submitted}
        </span>
        <label className="min-w-0 flex-1 cursor-pointer sm:flex-none">
          <input
            type="file"
            className="sr-only"
            onChange={(e) =>
              e.target.files?.[0] && onPickFile(e.target.files[0])
            }
          />
          <span
            className={`inline-flex w-full min-h-[36px] items-center justify-center rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold sm:w-auto ${
              missing
                ? "border-[var(--green)] bg-[var(--green)] text-white hover:bg-[var(--green-dark)]"
                : "border-[var(--border)] bg-white text-[var(--text-mid)] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)]"
            }`}
          >
            {missing ? app.upload : app.replace}
          </span>
        </label>
        {allowRemove ? (
          <button
            type="button"
            className={`${btnSmClass(false)} flex-1 border-[rgba(231,76,60,0.35)] text-[#8c2d22] hover:bg-[rgba(231,76,60,0.08)] sm:flex-none`}
            onClick={() => void onRemove?.()}
          >
            {app.remove}
          </button>
        ) : null}
      </div>
    </div>
  );
}
