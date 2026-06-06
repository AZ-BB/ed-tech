"use client";

import { sendApplicationPaymentRequest } from "@/actions/admin-application-payments";
import {
  assignAdminApplicationHandler,
  updateAdminApplicationInternalNotes,
  updateAdminApplicationStatus,
} from "@/actions/admin-applications";
import { SchoolStudentActivityLogsTab } from "@/app/(protected)/school/students/[id]/_components/school-student-activity-logs-tab";
import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";
import {
  ADMIN_APPLICATIONS_UNASSIGNED_FILTER,
  type AdminHandlerOption,
} from "@/app/(protected)/admin/applications/_lib/fetch-admin-handler-options";
import {
  ADMIN_APPLICATION_STATUS_FILTER_OPTIONS,
  ADMIN_APPLICATION_STATUS_LABEL,
  adminApplicationStatusPillClass,
} from "@/app/(protected)/admin/applications/_lib/application-status-labels";
import type { StudentActivityLogsPanelProps } from "@/lib/student-activity-logs";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";

import type { AdminApplicationDetailPayload } from "../_lib/fetch-admin-application-detail";
import type { AdminApplicationDetailTab } from "../_lib/parse-admin-application-detail-search-params";

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

const headerSelectClass =
  "min-w-[140px] cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_8px_center] bg-no-repeat py-[7px] pl-[10px] pr-9 text-[12px] text-[#4a4a4a] outline-none transition-colors focus:border-[#40916C] disabled:cursor-not-allowed disabled:opacity-60";

const TAB_DEFS: { id: AdminApplicationDetailTab; label: string }[] = [
  { id: "intake", label: "Intake" },
  { id: "profile", label: "Student & school" },
  { id: "documents", label: "Documents & payments" },
  { id: "notes", label: "Notes" },
  { id: "activity", label: "Activity" },
];

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCurriculum(value: string | null): string {
  if (!value) return "—";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function SnapItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
        {label}
      </div>
      <div className="mt-1 whitespace-pre-wrap text-[13px] font-medium text-[var(--text)]">
        {value || "—"}
      </div>
    </div>
  );
}

function paymentStatusClass(status: string): string {
  if (status === "paid") return "bg-[#e8f5ee] text-[#2D6A4F]";
  if (status === "failed") return "bg-[#FCEBEB] text-[#E74C3C]";
  return "bg-[#FFF3E0] text-[#E67E22]";
}

export type AdminApplicationViewClientProps = {
  payload: AdminApplicationDetailPayload;
  activityLogsPanel: StudentActivityLogsPanelProps;
  handlerOptions: AdminHandlerOption[];
  initialTab?: AdminApplicationDetailTab;
};

export function AdminApplicationViewClient({
  payload,
  activityLogsPanel,
  handlerOptions,
  initialTab = "intake",
}: AdminApplicationViewClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<AdminApplicationDetailTab>(initialTab);
  const [status, setStatus] = useState(payload.application.status);
  const [internalNotes, setInternalNotes] = useState(payload.application.internalNotes);
  const [handlerId, setHandlerId] = useState(payload.handler?.id ?? "");
  const [handlerName, setHandlerName] = useState(payload.handler?.name ?? "Unassigned");
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSelection, setAssignSelection] = useState(
    payload.handler?.id ?? ADMIN_APPLICATIONS_UNASSIGNED_FILTER,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [notesSaved, setNotesSaved] = useState(false);
  const [paymentRequestMessage, setPaymentRequestMessage] = useState<string | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const { application, plan, handler, student, school, documents, payments } = payload;

  const pendingPayment = payments.find((payment) => payment.status === "pending");
  const canSendPaymentRequest =
    Boolean(pendingPayment) &&
    application.studentEmail.trim() !== "" &&
    application.studentEmail !== "—";

  useEffect(() => {
    setStatus(payload.application.status);
    setInternalNotes(payload.application.internalNotes);
    setHandlerId(payload.handler?.id ?? "");
    setHandlerName(payload.handler?.name ?? "Unassigned");
    setAssignSelection(payload.handler?.id ?? ADMIN_APPLICATIONS_UNASSIGNED_FILTER);
  }, [payload]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams.toString());
    const currentTab = next.get("tab");

    if (tab === "intake") {
      if (!currentTab || currentTab === "intake") return;
      next.delete("tab");
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
      return;
    }

    if (currentTab === tab) return;
    next.set("tab", tab);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [tab, pathname, router, searchParams]);

  const ini = useMemo(() => {
    const parts = application.studentName.trim().split(/\s+/);
    const a = parts[0]?.[0] ?? "";
    const b = parts[1]?.[0] ?? "";
    const pair = `${a}${b}`.toUpperCase();
    return pair || "?";
  }, [application.studentName]);

  const sidebarRows = [
    { lab: "Application #", val: String(application.id) },
    { lab: "Package", val: plan ? `${plan.universitiesCount} universities` : "—" },
    { lab: "Handler", val: handlerName },
    { lab: "Submitted", val: formatDate(application.submittedAt) },
    { lab: "Created", val: formatDate(application.createdAt) },
    { lab: "Updated", val: formatDateTime(application.updatedAt) },
  ];

  function handleSendPaymentRequest() {
    setActionError(null);
    setPaymentRequestMessage(null);
    startTransition(async () => {
      const result = await sendApplicationPaymentRequest(application.id);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      setPaymentRequestMessage(`Payment request sent to ${result.email}.`);
      router.refresh();
    });
  }

  function handleStatusChange(nextStatus: string) {
    setActionError(null);
    setNotesSaved(false);
    const previous = status;
    setStatus(nextStatus);

    startTransition(async () => {
      const result = await updateAdminApplicationStatus(
        String(application.id),
        nextStatus,
      );
      if (!result.ok) {
        setStatus(previous);
        setActionError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleSaveNotes() {
    setActionError(null);
    setNotesSaved(false);

    startTransition(async () => {
      const result = await updateAdminApplicationInternalNotes(
        String(application.id),
        internalNotes,
      );
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      setNotesSaved(true);
      router.refresh();
    });
  }

  function handleAssign() {
    setActionError(null);

    startTransition(async () => {
      const result = await assignAdminApplicationHandler(
        String(application.id),
        assignSelection,
      );
      if (!result.ok) {
        setActionError(result.error);
        return;
      }

      const unassign = assignSelection === ADMIN_APPLICATIONS_UNASSIGNED_FILTER;
      const selected = handlerOptions.find((option) => option.id === assignSelection);
      setHandlerId(unassign ? "" : assignSelection);
      setHandlerName(unassign ? "Unassigned" : (selected?.label ?? "Handler"));
      setAssignOpen(false);
      router.refresh();
    });
  }

  const statusOptions = ADMIN_APPLICATION_STATUS_FILTER_OPTIONS.filter(
    (option) => option.value !== "",
  );

  let tabBody: ReactNode;

  if (tab === "intake") {
    tabBody = (
      <>
        <SchoolStudentPanel
          head="Application intake"
          sub="Details submitted through application support"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SnapItem label="Intended fields" value={application.intendedFields} />
            <SnapItem
              label="Open to related fields"
              value={application.openToRelatedFields ? "Yes" : "No"}
            />
            <SnapItem
              label="Preferred countries / universities"
              value={application.preferredUniOrCountries}
            />
            <SnapItem label="Curriculum" value={formatCurriculum(application.curriculum)} />
            <SnapItem label="Final grade / year" value={application.finalGrade} />
            <SnapItem
              label="Expected graduation year"
              value={
                application.expectedGraduationYear != null
                  ? String(application.expectedGraduationYear)
                  : "—"
              }
            />
            <SnapItem
              label="GPA"
              value={application.gpa != null ? String(application.gpa) : "—"}
            />
            <SnapItem
              label="SAT"
              value={application.sat != null ? String(application.sat) : "—"}
            />
            <SnapItem
              label="ACT"
              value={application.act != null ? String(application.act) : "—"}
            />
            <SnapItem
              label="IELTS"
              value={application.ielts != null ? String(application.ielts) : "—"}
            />
            <SnapItem
              label="TOEFL"
              value={application.toefl != null ? String(application.toefl) : "—"}
            />
            <SnapItem
              label="Extracurricular activities"
              value={application.extracurricularActivities}
            />
            <SnapItem label="Awards" value={application.awards ?? "—"} />
          </div>

          {application.universities.length > 0 ? (
            <div className="mt-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                Target universities
              </div>
              <div className="flex flex-wrap gap-2">
                {application.universities.map((uni) => (
                  <span
                    key={uni}
                    className="inline-flex rounded-full bg-[var(--green-bg)] px-2.5 py-1 text-[12px] font-medium text-[var(--green-dark)]"
                  >
                    {uni}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {application.preferencesUniversitiesNotes ? (
            <div className="mt-4">
              <SnapItem
                label="University notes"
                value={application.preferencesUniversitiesNotes}
              />
            </div>
          ) : null}

          {application.additionalNotes ? (
            <div className="mt-4">
              <SnapItem label="Student intake notes" value={application.additionalNotes} />
            </div>
          ) : null}
        </SchoolStudentPanel>

        {plan ? (
          <SchoolStudentPanel head="Package" sub="Application support plan">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SnapItem label="Plan name" value={plan.name} />
              <SnapItem
                label="Universities included"
                value={String(plan.universitiesCount)}
              />
              <SnapItem label="Price (AED)" value={plan.price.toLocaleString()} />
              <SnapItem label="Description" value={plan.description ?? "—"} />
            </div>
          </SchoolStudentPanel>
        ) : null}
      </>
    );
  } else if (tab === "profile") {
    tabBody = (
      <>
        <SchoolStudentPanel head="Student" sub="Linked student account">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SnapItem label="Full name" value={student.fullName} />
            <SnapItem label="Email" value={student.email} />
            <SnapItem label="Phone" value={student.phone ?? "—"} />
            <SnapItem label="Grade" value={student.grade ?? "—"} />
            <SnapItem label="Nationality" value={student.nationalityLabel} />
            <SnapItem label="Account status" value={student.isActive ? "Active" : "Inactive"} />
            <SnapItem
              label="Total logins"
              value={student.totalLogins != null ? String(student.totalLogins) : "—"}
            />
            <SnapItem
              label="School on application"
              value={application.schoolNameOnApplication ?? school?.name ?? "—"}
            />
          </div>
        </SchoolStudentPanel>

        {school ? (
          <SchoolStudentPanel head="School" sub="Student's school">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SnapItem label="School name" value={school.name} />
              <SnapItem label="School code" value={school.code} />
              <SnapItem label="Location" value={school.countryLabel} />
              <SnapItem label="Contact email" value={school.contactEmail ?? "—"} />
            </div>
          </SchoolStudentPanel>
        ) : (
          <SchoolStudentPanel head="School" sub="Student's school">
            <p className="text-[13px] text-[var(--text-light)]">
              No school linked to this application.
            </p>
          </SchoolStudentPanel>
        )}
      </>
    );
  } else if (tab === "documents") {
    tabBody = (
      <>
        <SchoolStudentPanel head="Documents" sub="Files uploaded with this application">
          {documents.length === 0 ? (
            <p className="text-[13px] text-[var(--text-light)]">
              No documents uploaded for this application.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--border-light)]">
              <table className="w-full min-w-[640px] border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">File</th>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3">Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-t border-[var(--border-light)] hover:bg-[#faf9f4]"
                    >
                      <td className="px-4 py-3 text-[var(--text)]">{doc.typeLabel}</td>
                      <td className="px-4 py-3 text-[var(--text-mid)]">{doc.fileName}</td>
                      <td className="px-4 py-3 text-[var(--text-mid)]">
                        {formatFileSize(doc.fileSize)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[var(--text-mid)]">
                        {formatDate(doc.uploadedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SchoolStudentPanel>

        <SchoolStudentPanel
          head="Payments"
          sub="Onboarding deposit and payment status"
          actions={
            canSendPaymentRequest ? (
              <button
                type="button"
                disabled={isPending}
                onClick={handleSendPaymentRequest}
                className="cursor-pointer rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-3 py-1.5 text-[11.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Sending…" : "Send Payment Request"}
              </button>
            ) : undefined
          }
        >
          {paymentRequestMessage ? (
            <p className="mb-3 text-[12px] font-medium text-[var(--green-dark)]">
              {paymentRequestMessage}
            </p>
          ) : null}
          {payments.length === 0 ? (
            <p className="text-[13px] text-[var(--text-light)]">
              No payment records for this application.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--border-light)]">
              <table className="w-full min-w-[480px] border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                    <th className="px-4 py-3">Amount (AED)</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Paid at</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-t border-[var(--border-light)] hover:bg-[#faf9f4]"
                    >
                      <td className="px-4 py-3 font-medium text-[var(--text)]">
                        {payment.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${paymentStatusClass(payment.status)}`}
                        >
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[var(--text-mid)]">
                        {payment.status === "paid" && payment.paidAt
                          ? formatDateTime(payment.paidAt)
                          : formatDateTime(payment.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SchoolStudentPanel>
      </>
    );
  } else if (tab === "notes") {
    tabBody = (
      <SchoolStudentPanel
        head="Internal notes"
        sub="Admin-only notes for this application case"
        actions={
          <button
            type="button"
            disabled={isPending}
            onClick={handleSaveNotes}
            className="cursor-pointer rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-3 py-1.5 text-[11.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save notes"}
          </button>
        }
      >
        <textarea
          value={internalNotes}
          onChange={(event) => {
            setInternalNotes(event.target.value);
            setNotesSaved(false);
          }}
          rows={10}
          placeholder="Add internal notes about this application case…"
          className="w-full resize-y rounded-[10px] border border-[var(--border-light)] bg-white px-3.5 py-3 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-hint)] focus:border-[var(--green-light)]"
        />
        {notesSaved ? (
          <p className="mt-2 text-[12px] font-medium text-[var(--green-dark)]">
            Notes saved.
          </p>
        ) : null}
      </SchoolStudentPanel>
    );
  } else {
    tabBody = (
      <SchoolStudentActivityLogsTab
        {...activityLogsPanel}
        head="Activity log"
        sub="All platform events recorded for this application"
      />
    );
  }

  return (
    <div className="w-full">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/applications"
          className="sd-back inline-flex cursor-pointer items-center gap-1.5 py-1.5 text-[12.5px] font-medium text-[var(--text-mid)] hover:text-[var(--green)] [&_svg]:h-[13px] [&_svg]:w-[13px]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to all applications
        </Link>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <label htmlFor="application-status" className="sr-only">
            Application status
          </label>
          <select
            id="application-status"
            value={status}
            disabled={isPending}
            onChange={(event) => handleStatusChange(event.target.value)}
            className={headerSelectClass}
            style={{ backgroundImage: SELECT_CHEVRON }}
            aria-label="Application status"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setAssignSelection(handlerId || ADMIN_APPLICATIONS_UNASSIGNED_FILTER);
              setAssignOpen(true);
            }}
            className="cursor-pointer rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-4 py-[7px] text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Assign
          </button>
        </div>
      </div>

      {actionError ? (
        <div className="mb-4 rounded-[10px] border border-[#f0c4c4] bg-[#FCEBEB] px-4 py-3 text-[13px] text-[#8c2d22]">
          {actionError}
        </div>
      ) : null}

      <div className="sd-grid grid grid-cols-1 items-start gap-5 xl:grid-cols-[280px_1fr] xl:gap-5">
        <aside className="sd-side flex flex-col gap-3.5 rounded-[14px] border border-[var(--border-light)] bg-white p-[22px] xl:sticky xl:top-[80px]">
          <div className="sd-side-top flex flex-col items-center gap-2.5 border-b border-[var(--border-light)] pb-[18px] text-center">
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] font-[family-name:var(--font-dm-serif)] text-2xl font-bold text-[var(--green-dark)]">
              {ini}
            </div>
            <div className="font-[family-name:var(--font-dm-serif)] text-xl leading-snug text-[var(--text)]">
              {application.studentName}
            </div>
            <div className="break-all text-xs text-[var(--text-light)]">
              {application.studentEmail}
            </div>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${adminApplicationStatusPillClass(status)}`}
            >
              {ADMIN_APPLICATION_STATUS_LABEL[
                status as keyof typeof ADMIN_APPLICATION_STATUS_LABEL
              ] ?? status}
            </span>
          </div>

          {sidebarRows.map((row) => (
            <div key={row.lab} className="flex justify-between gap-2 py-1 text-[12.5px]">
              <span className="shrink-0 text-[var(--text-light)]">{row.lab}</span>
              <span className="max-w-[60%] text-right font-medium text-[var(--text)]">
                {row.val}
              </span>
            </div>
          ))}

          <div className="mt-1 flex flex-col gap-1.5">
            <Link
              href={student.href}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-2.5 py-1.5 text-[11.5px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              View student profile
            </Link>
            {school ? (
              <Link
                href={school.href}
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border-[1.5px] border-[var(--border)] bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[var(--green-light)] hover:text-[var(--green-dark)]"
              >
                View school
              </Link>
            ) : null}
          </div>
        </aside>

        <div className="sd-main flex flex-col gap-[18px]">
          <div className="sd-tabs flex gap-0.5 overflow-x-auto rounded-[10px] border border-[var(--border-light)] bg-white p-1">
            {TAB_DEFS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`shrink-0 cursor-pointer rounded-[8px] px-3.5 py-2 text-[12.5px] font-semibold transition-colors ${
                    active
                      ? "bg-[var(--green)] text-white"
                      : "text-[var(--text-mid)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)]"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {tabBody}
        </div>
      </div>

      {assignOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(15,30,20,0.45)] p-4"
          role="presentation"
          onClick={() => {
            if (!isPending) setAssignOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-handler-title"
            className="w-full max-w-[400px] rounded-[12px] border border-[#ece9e4] bg-white p-5 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h3
              id="assign-handler-title"
              className="text-[15px] font-semibold text-[var(--text)]"
            >
              Assign handler
            </h3>
            <p className="mt-1 text-[12px] text-[var(--text-light)]">
              Choose the handler responsible for this application case.
            </p>

            <label
              htmlFor="assign-handler-select"
              className="mt-4 mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]"
            >
              Handler
            </label>
            <select
              id="assign-handler-select"
              value={assignSelection}
              disabled={isPending}
              onChange={(event) => setAssignSelection(event.target.value)}
              className={`${headerSelectClass} w-full`}
              style={{ backgroundImage: SELECT_CHEVRON }}
            >
              <option value={ADMIN_APPLICATIONS_UNASSIGNED_FILTER}>Unassigned</option>
              {handlerOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setAssignOpen(false)}
                className="cursor-pointer rounded-[8px] border border-[#e0deda] bg-white px-4 py-2 text-[12px] font-semibold text-[var(--text-mid)] transition-colors hover:border-[var(--green-light)] hover:text-[var(--green-dark)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleAssign}
                className="cursor-pointer rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-4 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Saving…" : "Save assignment"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
