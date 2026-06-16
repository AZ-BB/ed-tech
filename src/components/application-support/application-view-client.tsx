"use client";

import { SchoolStudentActivityLogsTab } from "@/app/(protected)/school/students/[id]/_components/school-student-activity-logs-tab";
import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";
import {
  ADMIN_APPLICATIONS_UNASSIGNED_FILTER,
  type AdminApplicationAdvisorOption,
} from "@/app/(protected)/admin/applications/_lib/fetch-admin-application-advisor-options";
import {
  ADMIN_APPLICATION_STATUS_FILTER_OPTIONS,
  ADMIN_APPLICATION_STATUS_LABEL,
  adminApplicationStatusPillClass,
} from "@/app/(protected)/admin/applications/_lib/application-status-labels";
import {
  APPLICATION_ADMISSION_STATUS_LABEL,
  APPLICATION_ADMISSION_STATUS_OPTIONS,
  applicationAdmissionStatusPillClass,
} from "@/lib/application-admission-status";
import type { ApplicationDetailPayload } from "@/lib/application-detail-mapper";
import type { StudentActivityLogsPanelProps } from "@/lib/student-activity-logs";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";

import { AdminSendPaymentRequestDialog } from "@/app/(protected)/admin/applications/[id]/_components/admin-send-payment-request-dialog";
import {
  ApplicationChecklistDocumentsTab,
  type ApplicationChecklistActions,
} from "@/components/application-support/application-checklist-documents-tab";
import {
  ApplicationCallsTab,
  type ApplicationCallsActions,
} from "@/components/application-support/application-calls-tab";
import {
  ApplicationUniversityTargetsTab,
  type ApplicationUniversityTargetsActions,
} from "@/components/application-support/application-university-targets-tab";
import {
  ApplicationTasksTab,
  type ApplicationTasksActions,
} from "@/components/application-support/application-tasks-tab";
import {
  ApplicationPackageTab,
  type ApplicationPackageActions,
} from "@/components/application-support/application-package-tab";
import { AdminApplicationPayoutsTab } from "@/app/(protected)/admin/applications/[id]/_components/admin-application-payouts-tab";
import { EditApplicationPackageDialog } from "@/components/application-support/edit-application-package-dialog";

import type { ApplicationPayoutRow } from "@/lib/advisor-payouts/types";

export type ApplicationDetailTab =
  | "intake"
  | "package"
  | "universities"
  | "profile"
  | "documents"
  | "payments"
  | "payouts"
  | "calls"
  | "tasks"
  | "notes"
  | "activity";

type ActionResult = { ok: true } | { ok: false; error: string };
type PaymentActionResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

export type ApplicationViewConfig = {
  backHref: string;
  backLabel: string;
  canAssignAdvisor: boolean;
  showStudentAdminLink: boolean;
  showSchoolAdminLink: boolean;
  notesSub?: string;
  showPayoutSummary?: boolean;
  showPayoutsTab?: boolean;
};

export type ApplicationViewActions = {
  updateStatus: (applicationId: string, status: string) => Promise<ActionResult>;
  updateAdmissionStatus: (
    applicationId: string,
    admissionStatus: string,
  ) => Promise<ActionResult>;
  addInternalNote: (applicationId: string, content: string) => Promise<ActionResult>;
  sendPaymentRequest: (applicationId: number, amountAed: number) => Promise<PaymentActionResult>;
  assignAdvisor?: (applicationId: string, advisorId: string) => Promise<ActionResult>;
  checklist: ApplicationChecklistActions;
  calls: ApplicationCallsActions;
  tasks: ApplicationTasksActions;
  package: ApplicationPackageActions;
  universityTargets: ApplicationUniversityTargetsActions;
};

export type ApplicationViewClientProps = {
  payload: ApplicationDetailPayload;
  activityLogsPanel: StudentActivityLogsPanelProps;
  config: ApplicationViewConfig;
  actions: ApplicationViewActions;
  advisorOptions?: AdminApplicationAdvisorOption[];
  initialTab?: ApplicationDetailTab;
  applicationPayouts?: ApplicationPayoutRow[];
};

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

const headerSelectClass =
  "min-w-[140px] cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_8px_center] bg-no-repeat py-[7px] pl-[10px] pr-9 text-[12px] text-[#4a4a4a] outline-none transition-colors focus:border-[#40916C] disabled:cursor-not-allowed disabled:opacity-60";

const BASE_TAB_DEFS: { id: ApplicationDetailTab; label: string }[] = [
  { id: "intake", label: "Intake" },
  { id: "package", label: "Package" },
  { id: "universities", label: "Universities" },
  { id: "profile", label: "Student & school" },
  { id: "documents", label: "Documents" },
  { id: "payments", label: "Payments" },
  { id: "calls", label: "Calls" },
  { id: "tasks", label: "Tasks" },
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

function payoutStatusClass(status: string): string {
  if (status === "paid") return "bg-[#e8f5ee] text-[#2D6A4F]";
  if (status === "canceled") return "bg-[#FCEBEB] text-[#E74C3C]";
  return "bg-[#FFF3E0] text-[#E67E22]";
}

export function ApplicationViewClient({
  payload,
  activityLogsPanel,
  config,
  actions,
  advisorOptions = [],
  initialTab = "intake",
  applicationPayouts = [],
}: ApplicationViewClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<ApplicationDetailTab>(initialTab);
  const [status, setStatus] = useState(payload.application.status);
  const [admissionStatus, setAdmissionStatus] = useState(
    payload.application.admissionStatus,
  );
  const [newNoteContent, setNewNoteContent] = useState("");
  const [advisorId, setAdvisorId] = useState(payload.advisor?.id ?? "");
  const [advisorName, setAdvisorName] = useState(payload.advisor?.name ?? "Unassigned");
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSelection, setAssignSelection] = useState(
    payload.advisor?.id ?? ADMIN_APPLICATIONS_UNASSIGNED_FILTER,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [paymentRequestMessage, setPaymentRequestMessage] = useState<string | null>(
    null,
  );
  const [paymentRequestOpen, setPaymentRequestOpen] = useState(false);
  const [paymentRequestError, setPaymentRequestError] = useState<string | null>(null);
  const [editPackageOpen, setEditPackageOpen] = useState(false);
  const [editPackageError, setEditPackageError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { application, plan, student, school, payments, internalNotes, checklistDocuments, universityTargets, calls, tasks, packageView, payoutSummary } =
    payload;

  const tabDefs = useMemo(() => {
    if (!config.showPayoutsTab) return BASE_TAB_DEFS;
    const next = [...BASE_TAB_DEFS];
    const paymentsIndex = next.findIndex((tabDef) => tabDef.id === "payments");
    next.splice(paymentsIndex + 1, 0, { id: "payouts", label: "Payouts" });
    return next;
  }, [config.showPayoutsTab]);

  const planPrice = plan?.price ?? 0;
  const packageUniversitiesTotal = plan?.universitiesCount ?? packageView.universitiesTotal;
  const packageDefaultUniversitiesCount =
    plan?.defaultUniversitiesCount ?? packageUniversitiesTotal;
  const packagePlanName = plan?.name ?? packageView.packageLabel;
  const totalPaid = useMemo(
    () =>
      payments
        .filter((payment) => payment.status === "paid")
        .reduce((sum, payment) => sum + payment.amount, 0),
    [payments],
  );
  const remainingBalance = Math.max(0, planPrice - totalPaid);
  const hasStudentEmail =
    application.studentEmail.trim() !== "" && application.studentEmail !== "—";

  useEffect(() => {
    setStatus(payload.application.status);
    setAdmissionStatus(payload.application.admissionStatus);
    setAdvisorId(payload.advisor?.id ?? "");
    setAdvisorName(payload.advisor?.name ?? "Unassigned");
    setAssignSelection(payload.advisor?.id ?? ADMIN_APPLICATIONS_UNASSIGNED_FILTER);
  }, [payload]);

  useEffect(() => {
    if (initialTab === "payouts" && !config.showPayoutsTab) {
      setTab("payments");
      return;
    }
    setTab(initialTab);
  }, [initialTab, config.showPayoutsTab]);

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
    { lab: "Package", val: `${packageUniversitiesTotal} universities` },
    { lab: "Advisor", val: advisorName },
    {
      lab: "Admission",
      val:
        APPLICATION_ADMISSION_STATUS_LABEL[
          admissionStatus as keyof typeof APPLICATION_ADMISSION_STATUS_LABEL
        ] ?? admissionStatus,
    },
    { lab: "Submitted", val: formatDate(application.submittedAt) },
    { lab: "Created", val: formatDate(application.createdAt) },
    { lab: "Updated", val: formatDateTime(application.updatedAt) },
  ];

  function handleOpenEditPackage() {
    setActionError(null);
    setEditPackageError(null);
    setEditPackageOpen(true);
  }

  function handleSavePackageUniversitiesTotal(universitiesTotal: number) {
    setEditPackageError(null);
    startTransition(async () => {
      const result = await actions.package.updateUniversitiesTotal(
        String(application.id),
        universitiesTotal,
      );
      if (!result.ok) {
        setEditPackageError(result.error);
        return;
      }
      setEditPackageOpen(false);
      router.refresh();
    });
  }

  function handleOpenPaymentRequest() {
    setActionError(null);
    setPaymentRequestMessage(null);
    setPaymentRequestError(null);
    setPaymentRequestOpen(true);
  }

  function handleSendPaymentRequest(amountAed: number) {
    setActionError(null);
    setPaymentRequestMessage(null);
    setPaymentRequestError(null);
    startTransition(async () => {
      const result = await actions.sendPaymentRequest(application.id, amountAed);
      if (!result.ok) {
        setPaymentRequestError(result.error);
        return;
      }
      setPaymentRequestOpen(false);
      setPaymentRequestMessage(
        `Payment request for ${amountAed.toLocaleString()} AED sent to ${result.email}.`,
      );
      router.refresh();
    });
  }

  function handleStatusChange(nextStatus: string) {
    setActionError(null);
    setNoteError(null);
    const previous = status;
    setStatus(nextStatus);

    startTransition(async () => {
      const result = await actions.updateStatus(String(application.id), nextStatus);
      if (!result.ok) {
        setStatus(previous);
        setActionError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleAdmissionStatusChange(nextAdmissionStatus: string) {
    setActionError(null);
    setNoteError(null);
    const previous = admissionStatus;
    setAdmissionStatus(nextAdmissionStatus);

    startTransition(async () => {
      const result = await actions.updateAdmissionStatus(
        String(application.id),
        nextAdmissionStatus,
      );
      if (!result.ok) {
        setAdmissionStatus(previous);
        setActionError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleAddNote() {
    setActionError(null);
    setNoteError(null);
    const content = newNoteContent.trim();
    if (!content) {
      setNoteError("Note cannot be empty.");
      return;
    }

    startTransition(async () => {
      const result = await actions.addInternalNote(String(application.id), content);
      if (!result.ok) {
        setNoteError(result.error);
        return;
      }
      setNewNoteContent("");
      router.refresh();
    });
  }

  function handleAssign() {
    if (!actions.assignAdvisor) return;
    setActionError(null);

    startTransition(async () => {
      const result = await actions.assignAdvisor!(
        String(application.id),
        assignSelection,
      );
      if (!result.ok) {
        setActionError(result.error);
        return;
      }

      const unassign = assignSelection === ADMIN_APPLICATIONS_UNASSIGNED_FILTER;
      const selected = advisorOptions.find((option) => option.id === assignSelection);
      setAdvisorId(unassign ? "" : assignSelection);
      setAdvisorName(unassign ? "Unassigned" : (selected?.label ?? "Advisor"));
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
  } else if (tab === "package") {
    tabBody = (
      <ApplicationPackageTab
        applicationId={application.id}
        packageView={packageView}
        actions={actions.package}
      />
    );
  } else if (tab === "universities") {
    tabBody = (
      <ApplicationUniversityTargetsTab
        applicationId={application.id}
        targets={universityTargets}
        checklistDocuments={checklistDocuments}
        universitiesTotal={packageUniversitiesTotal}
        actions={actions.universityTargets}
      />
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
      <ApplicationChecklistDocumentsTab
        applicationId={application.id}
        documents={checklistDocuments}
        actions={actions.checklist}
      />
    );
  } else if (tab === "payments") {
    tabBody = (
      <SchoolStudentPanel
        head="Payments"
        sub="Send a payment request to collect application support fees"
        actions={
          <button
            type="button"
            disabled={isPending || !hasStudentEmail}
            onClick={handleOpenPaymentRequest}
            className="cursor-pointer rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-3 py-1.5 text-[11.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send Payment Request
          </button>
        }
      >
        {paymentRequestMessage ? (
          <p className="mb-3 text-[12px] font-medium text-[var(--green-dark)]">
            {paymentRequestMessage}
          </p>
        ) : null}
        {config.showPayoutSummary && payoutSummary ? (
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SnapItem
              label="Payout percentage"
              value={`${payoutSummary.payoutPercentage}%`}
            />
            <SnapItem
              label="Total pending"
              value={`${payoutSummary.pendingAmount.toLocaleString()} AED / ${payoutSummary.pendingCount} payment${payoutSummary.pendingCount === 1 ? "" : "s"}`}
            />
            <SnapItem
              label="Total paid"
              value={`${payoutSummary.paidAmount.toLocaleString()} AED / ${payoutSummary.paidCount} payment${payoutSummary.paidCount === 1 ? "" : "s"}`}
            />
          </div>
        ) : null}
        {payments.length === 0 ? (
          <p className="text-[13px] text-[var(--text-light)]">
            No payment request has been sent yet. Use Send Payment Request to email
            the student a secure checkout link.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--border-light)]">
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  <th className="px-4 py-3">Amount (AED)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payout %</th>
                  <th className="px-4 py-3">Payout (AED)</th>
                  <th className="px-4 py-3">Payout status</th>
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
                    <td className="px-4 py-3 text-[var(--text-mid)]">
                      {payment.payout ? `${payment.payout.percentage}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-mid)]">
                      {payment.payout ? payment.payout.amount.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {payment.payout ? (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${payoutStatusClass(payment.payout.status)}`}
                        >
                          {payment.payout.status}
                        </span>
                      ) : (
                        <span className="text-[var(--text-mid)]">—</span>
                      )}
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
    );
  } else if (tab === "payouts" && config.showPayoutsTab) {
    tabBody = (
      <AdminApplicationPayoutsTab
        applicationId={application.id}
        payouts={applicationPayouts}
      />
    );
  } else if (tab === "calls") {
    tabBody = (
      <ApplicationCallsTab
        applicationId={application.id}
        studentName={student.fullName}
        calls={calls}
        actions={actions.calls}
      />
    );
  } else if (tab === "tasks") {
    tabBody = (
      <ApplicationTasksTab
        applicationId={application.id}
        tasks={tasks}
        actions={actions.tasks}
      />
    );
  } else if (tab === "notes") {
    tabBody = (
      <SchoolStudentPanel
        head="Internal notes"
        sub={config.notesSub ?? "Staff-only notes for this application case"}
      >
        <div className="mb-3.5 flex flex-col gap-2.5 rounded-[10px] border border-[var(--border-light)] bg-[rgb(250,249,244)] p-3.5">
          <textarea
            value={newNoteContent}
            onChange={(event) => {
              setNewNoteContent(event.target.value);
              setNoteError(null);
            }}
            rows={4}
            maxLength={8000}
            placeholder="Add an internal note… (Cmd+Enter to save)"
            disabled={isPending}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !isPending) {
                event.preventDefault();
                handleAddNote();
              }
            }}
            className="w-full resize-y rounded-[8px] border-[1.5px] border-[var(--border)] bg-white px-3 py-2.5 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-hint)] focus:border-[var(--green-light)] disabled:opacity-60"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-[var(--text-hint)]">
              Visible to platform admins and the assigned advisor only.
            </p>
            <button
              type="button"
              disabled={isPending || !newNoteContent.trim()}
              onClick={handleAddNote}
              className="cursor-pointer rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-3 py-1.5 text-[11.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Add note"}
            </button>
          </div>
          {noteError ? (
            <p className="text-[12px] font-medium text-[#8c2d22]">{noteError}</p>
          ) : null}
        </div>

        {internalNotes.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-[var(--text-light)]">
            No notes yet — add the first one above.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {internalNotes.map((note) => (
              <div
                key={note.id}
                className="rounded-[10px] border border-[var(--border-light)] bg-white p-3.5"
              >
                <div className="mb-2 flex items-center justify-between gap-2.5">
                  <div className="min-w-0 text-[12px] text-[var(--text-mid)]">
                    <strong className="font-semibold text-[var(--text)]">
                      {note.authorName}
                    </strong>
                    {" · "}
                    <span className="inline-flex items-center rounded-[20px] border border-[var(--border)] px-2 py-0.5 text-[10.5px] font-semibold capitalize text-[var(--text-mid)]">
                      {note.authorRole}
                    </span>
                  </div>
                  <div className="shrink-0 text-[11.5px] text-[var(--text-hint)]">
                    {formatDateTime(note.createdAt)}
                  </div>
                </div>
                <div className="text-[13px] leading-[1.55] whitespace-pre-wrap text-[var(--text)]">
                  {note.content}
                </div>
              </div>
            ))}
          </div>
        )}
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
          href={config.backHref}
          className="sd-back inline-flex cursor-pointer items-center gap-1.5 py-1.5 text-[12.5px] font-medium text-[var(--text-mid)] hover:text-[var(--green)] [&_svg]:h-[13px] [&_svg]:w-[13px]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {config.backLabel}
        </Link>

        <div className="flex flex-wrap items-end justify-end gap-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="application-admission-status"
              className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]"
            >
              Admission status
            </label>
            <select
              id="application-admission-status"
              value={admissionStatus}
              disabled={isPending}
              onChange={(event) => handleAdmissionStatusChange(event.target.value)}
              className={headerSelectClass}
              style={{ backgroundImage: SELECT_CHEVRON }}
            >
              {APPLICATION_ADMISSION_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="application-status"
              className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]"
            >
              Status
            </label>
            <select
              id="application-status"
              value={status}
              disabled={isPending}
              onChange={(event) => handleStatusChange(event.target.value)}
              className={headerSelectClass}
              style={{ backgroundImage: SELECT_CHEVRON }}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
              Package
            </span>
            <button
              type="button"
              disabled={isPending}
              onClick={handleOpenEditPackage}
              className="cursor-pointer whitespace-nowrap rounded-[8px] border-[1.5px] border-[var(--green)] bg-white px-4 py-[7px] text-[12px] font-semibold text-[var(--green-dark)] transition-colors hover:bg-[var(--green-pale)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Edit package
            </button>
          </div>

          {config.canAssignAdvisor ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setAssignSelection(advisorId || ADMIN_APPLICATIONS_UNASSIGNED_FILTER);
                setAssignOpen(true);
              }}
              className="cursor-pointer rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-4 py-[7px] text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Assign
            </button>
          ) : null}
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
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${applicationAdmissionStatusPillClass(admissionStatus)}`}
            >
              {APPLICATION_ADMISSION_STATUS_LABEL[
                admissionStatus as keyof typeof APPLICATION_ADMISSION_STATUS_LABEL
              ] ?? admissionStatus}
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
            {config.showStudentAdminLink && student.href ? (
              <Link
                href={student.href}
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-2.5 py-1.5 text-[11.5px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                View student profile
              </Link>
            ) : null}
            {config.showSchoolAdminLink && school?.href ? (
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
            {tabDefs.map((t) => {
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

      {config.canAssignAdvisor && assignOpen ? (
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
            aria-labelledby="assign-advisor-title"
            className="w-full max-w-[400px] rounded-[12px] border border-[#ece9e4] bg-white p-5 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h3
              id="assign-advisor-title"
              className="text-[15px] font-semibold text-[var(--text)]"
            >
              Assign advisor
            </h3>
            <p className="mt-1 text-[12px] text-[var(--text-light)]">
              Choose the advisor responsible for this application case.
            </p>

            <label
              htmlFor="assign-advisor-select"
              className="mt-4 mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]"
            >
              Advisor
            </label>
            <select
              id="assign-advisor-select"
              value={assignSelection}
              disabled={isPending}
              onChange={(event) => setAssignSelection(event.target.value)}
              className={`${headerSelectClass} w-full`}
              style={{ backgroundImage: SELECT_CHEVRON }}
            >
              <option value={ADMIN_APPLICATIONS_UNASSIGNED_FILTER}>Unassigned</option>
              {advisorOptions.map((option) => (
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

      <AdminSendPaymentRequestDialog
        open={paymentRequestOpen}
        onClose={() => {
          if (!isPending) setPaymentRequestOpen(false);
        }}
        onSubmit={handleSendPaymentRequest}
        isSubmitting={isPending}
        error={paymentRequestError}
        planPrice={planPrice}
        totalPaid={totalPaid}
        studentEmail={application.studentEmail}
      />

      <EditApplicationPackageDialog
        open={editPackageOpen}
        planName={packagePlanName}
        universitiesTotal={Math.max(1, packageUniversitiesTotal)}
        defaultUniversitiesCount={Math.max(1, packageDefaultUniversitiesCount)}
        minUniversities={universityTargets.length}
        onClose={() => {
          if (!isPending) setEditPackageOpen(false);
        }}
        onSubmit={handleSavePackageUniversitiesTotal}
        isSubmitting={isPending}
        error={editPackageError}
      />
    </div>
  );
}
