"use client";

import { SchoolStudentActivityLogsTab } from "@/app/(protected)/school/students/[id]/_components/school-student-activity-logs-tab";
import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";
import {
  ADMIN_APPLICATIONS_UNASSIGNED_FILTER,
  type AdminApplicationAdvisorOption,
} from "@/app/(protected)/admin/applications/_lib/fetch-admin-application-advisor-options";
import {
  adminAssigneeOptionValue,
  type AdminApplicationAdminOption,
} from "@/app/(protected)/admin/applications/_lib/fetch-admin-application-admin-options";
import {
  ADMIN_APPLICATION_STATUS_FILTER_OPTIONS,
  ADMIN_APPLICATION_STATUS_LABEL,
  adminApplicationStatusPillClass,
} from "@/app/(protected)/admin/applications/_lib/application-status-labels";
import type { ApplicationDetailPayload } from "@/lib/application-detail-mapper";
import type { ApplicationNoteVisibility } from "@/lib/application-internal-notes";
import type { PaymentRequestModalContext } from "@/lib/fetch-payment-request-modal-context";
import type { SendPaymentRequestInput } from "@/lib/payment-request-email-content";
import { hasActivePendingPaymentRequest } from "@/lib/payment-request-utils";
import type { StudentActivityLogsPanelProps } from "@/lib/student-activity-logs";
import { parseAdminApplicationDetailTab } from "@/app/(protected)/admin/applications/[id]/_lib/parse-admin-application-detail-search-params";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { SendPaymentRequestDialog } from "@/components/application-support/send-payment-request-dialog";
import { AddApplicationInternalNoteDialog } from "@/components/application-support/add-application-internal-note-dialog";
import {
  LogApplicationCallDialog,
  type LogApplicationCallFormData,
} from "@/components/application-support/log-application-call-dialog";
import { AdminStudentDocumentsTab } from "@/app/(protected)/admin/users/students/[id]/_components/admin-student-documents-tab";
import { AdvisorStudentDocumentsTab } from "@/app/(protected)/advisor/applications/[id]/_components/advisor-student-documents-tab";
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
import { AdvisorApplicationPayoutsTab } from "@/app/(protected)/advisor/applications/[id]/_components/advisor-application-payouts-tab";
import { EditApplicationPackageDialog } from "@/components/application-support/edit-application-package-dialog";
import { ApplicationSupportIntakeDialog } from "@/components/application-support/application-support-intake-dialog";
import type { ApplicationSupportPayload } from "@/lib/application-support-intake";

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
  showProfileTab?: boolean;
  notesSub?: string;
  activitySub?: string;
  showPayoutSummary?: boolean;
  showPayoutsTab?: boolean;
  payoutsTabVariant?: "admin" | "advisor";
  blockPaymentRequestIfPending?: boolean;
  showHeaderQuickActions?: boolean;
  documentsPortal?: "admin" | "advisor";
  canEditIntake?: boolean;
};

export type ApplicationViewActions = {
  updateStatus: (applicationId: string, status: string) => Promise<ActionResult>;
  addInternalNote: (
    applicationId: string,
    content: string,
    visibility?: ApplicationNoteVisibility,
  ) => Promise<ActionResult>;
  sendPaymentRequest: (input: SendPaymentRequestInput) => Promise<PaymentActionResult>;
  toggleStudentFlag?: (applicationId: string) => Promise<ActionResult>;
  updateIntake?: (
    applicationId: string,
    payload: ApplicationSupportPayload,
  ) => Promise<ActionResult>;
  assignAdvisor?: (applicationId: string, advisorId: string) => Promise<ActionResult>;
  assignAssignee?: (applicationId: string, assigneeRaw: string) => Promise<ActionResult>;
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
  adminOptions?: AdminApplicationAdminOption[];
  initialTab?: ApplicationDetailTab;
  applicationPayouts?: ApplicationPayoutRow[];
  paymentRequestContext?: PaymentRequestModalContext | null;
  intakeEdit?: {
    initialPayload: ApplicationSupportPayload;
  } | null;
};

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

const headerSelectClass =
  "min-w-[140px] cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_8px_center] bg-no-repeat py-[7px] pl-[10px] pr-9 text-[12px] text-[#4a4a4a] outline-none transition-colors focus:border-[#40916C] disabled:cursor-not-allowed disabled:opacity-60";

const headerQuickActionOutlineClass =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border border-[#e0deda] bg-white px-3 py-[7px] text-[12px] font-semibold text-[#4a4a4a] transition-colors hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)] disabled:cursor-not-allowed disabled:opacity-60";

const headerQuickActionPrimaryClass =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-3 py-[7px] text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";

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

function resolveApplicationDetailTab(
  rawTab: string | null,
  config: ApplicationViewConfig,
): ApplicationDetailTab {
  const parsed = parseAdminApplicationDetailTab(rawTab ?? undefined);
  if (parsed === "payouts" && !config.showPayoutsTab) return "payments";
  if (parsed === "profile" && config.showProfileTab === false) return "intake";
  return parsed;
}

function resolveAssigneeSelection(payload: ApplicationDetailPayload): string {
  if (payload.admin?.id) {
    return adminAssigneeOptionValue("admin", payload.admin.id);
  }
  if (payload.advisor?.id) {
    return adminAssigneeOptionValue("advisor", payload.advisor.id);
  }
  return ADMIN_APPLICATIONS_UNASSIGNED_FILTER;
}

function resolveOwnerLabel(payload: ApplicationDetailPayload): string {
  if (payload.admin?.name) {
    return `${payload.admin.name} (Admin)`;
  }
  if (payload.advisor?.name) {
    return `${payload.advisor.name} (Advisor)`;
  }
  return "Unassigned";
}

export function ApplicationViewClient({
  payload,
  activityLogsPanel,
  config,
  actions,
  advisorOptions = [],
  adminOptions = [],
  applicationPayouts = [],
  paymentRequestContext = null,
  intakeEdit = null,
}: ApplicationViewClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<ApplicationDetailTab>(() =>
    resolveApplicationDetailTab(searchParams.get("tab"), config),
  );
  const [status, setStatus] = useState(payload.application.status);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteVisibility, setNewNoteVisibility] =
    useState<ApplicationNoteVisibility>("internal");
  const [advisorId, setAdvisorId] = useState(payload.advisor?.id ?? "");
  const [advisorName, setAdvisorName] = useState(payload.advisor?.name ?? "Unassigned");
  const [ownerLabel, setOwnerLabel] = useState(resolveOwnerLabel(payload));
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSelection, setAssignSelection] = useState(resolveAssigneeSelection(payload));
  const [actionError, setActionError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [paymentRequestMessage, setPaymentRequestMessage] = useState<string | null>(
    null,
  );
  const [paymentRequestOpen, setPaymentRequestOpen] = useState(false);
  const [paymentRequestError, setPaymentRequestError] = useState<string | null>(null);
  const [editPackageOpen, setEditPackageOpen] = useState(false);
  const [editPackageError, setEditPackageError] = useState<string | null>(null);
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [addNoteError, setAddNoteError] = useState<string | null>(null);
  const [logCallOpen, setLogCallOpen] = useState(false);
  const [logCallError, setLogCallError] = useState<string | null>(null);
  const [intakeEditOpen, setIntakeEditOpen] = useState(false);
  const [studentFlagged, setStudentFlagged] = useState(payload.student.flagged);
  const [isPending, startTransition] = useTransition();

  const { application, plan, student, school, payments, internalNotes, studentDocuments, universityTargets, calls, tasks, packageView, payoutSummary } =
    payload;

  const tabDefs = useMemo(() => {
    const profileVisible = config.showProfileTab !== false;
    const base = profileVisible
      ? BASE_TAB_DEFS
      : BASE_TAB_DEFS.filter((tabDef) => tabDef.id !== "profile");
    if (!config.showPayoutsTab) return base;
    const next = [...base];
    const paymentsIndex = next.findIndex((tabDef) => tabDef.id === "payments");
    next.splice(paymentsIndex + 1, 0, { id: "payouts", label: "Payouts" });
    return next;
  }, [config.showPayoutsTab, config.showProfileTab]);

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
  const hasPendingPaymentRequest = useMemo(
    () => hasActivePendingPaymentRequest(payments),
    [payments],
  );
  const paymentRequestBlocked =
    config.blockPaymentRequestIfPending === true && hasPendingPaymentRequest;

  useEffect(() => {
    setStatus(payload.application.status);
    setAdvisorId(payload.advisor?.id ?? "");
    setAdvisorName(payload.advisor?.name ?? "Unassigned");
    setOwnerLabel(resolveOwnerLabel(payload));
    setAssignSelection(resolveAssigneeSelection(payload));
    setStudentFlagged(payload.student.flagged);
  }, [payload]);

  useEffect(() => {
    const fromUrl = resolveApplicationDetailTab(searchParams.get("tab"), config);
    setTab((current) => (current === fromUrl ? current : fromUrl));
  }, [searchParams, config.showPayoutsTab, config.showProfileTab]);

  const switchTab = useCallback(
    (next: ApplicationDetailTab) => {
      setTab(next);
      const nextParams = new URLSearchParams(searchParams.toString());
      if (next === "intake") {
        nextParams.delete("tab");
      } else {
        nextParams.set("tab", next);
      }
      const q = nextParams.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

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
    { lab: "Assigned to", val: ownerLabel },
    { lab: "Scheduled at", val: formatDateTime(application.scheduledAt) },
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

  function handleSendPaymentRequest(input: SendPaymentRequestInput) {
    setActionError(null);
    setPaymentRequestMessage(null);
    setPaymentRequestError(null);
    startTransition(async () => {
      const result = await actions.sendPaymentRequest(input);
      if (!result.ok) {
        setPaymentRequestError(result.error);
        return;
      }
      setPaymentRequestOpen(false);
      setPaymentRequestMessage(
        `Payment request for ${input.amountAed.toLocaleString()} AED sent to ${result.email}.`,
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

  function handleAddNote() {
    setActionError(null);
    setNoteError(null);
    const content = newNoteContent.trim();
    if (!content) {
      setNoteError("Note cannot be empty.");
      return;
    }

    startTransition(async () => {
      const result = await actions.addInternalNote(
        String(application.id),
        content,
        newNoteVisibility,
      );
      if (!result.ok) {
        setNoteError(result.error);
        return;
      }
      setNewNoteContent("");
      setNewNoteVisibility("internal");
      router.refresh();
    });
  }

  function handleAddNoteFromDialog(
    content: string,
    visibility: ApplicationNoteVisibility,
  ) {
    setActionError(null);
    setAddNoteError(null);
    if (!content) {
      setAddNoteError("Note cannot be empty.");
      return;
    }

    startTransition(async () => {
      const result = await actions.addInternalNote(
        String(application.id),
        content,
        visibility,
      );
      if (!result.ok) {
        setAddNoteError(result.error);
        return;
      }
      setAddNoteOpen(false);
      router.refresh();
    });
  }

  function handleLogCall(form: LogApplicationCallFormData) {
    setActionError(null);
    setLogCallError(null);
    const durationMinutes = Number.parseInt(form.durationMinutes.trim(), 10);

    startTransition(async () => {
      const result = await actions.calls.logCall({
        applicationId: String(application.id),
        callType: form.callType,
        durationMinutes,
        callDate: form.callDate,
        status: form.status,
        outcome: form.outcome || null,
        summary: form.summary.trim() || null,
        createFollowUpTask: form.createFollowUpTask,
        followUpTaskTitle: form.createFollowUpTask
          ? form.followUpTaskTitle.trim() || null
          : null,
        followUpTaskDueDate: form.createFollowUpTask
          ? form.followUpTaskDueDate.trim() || null
          : null,
      });

      if (!result.ok) {
        setLogCallError(result.error);
        return;
      }
      setLogCallOpen(false);
      router.refresh();
    });
  }

  function handleToggleStudentFlag() {
    if (!actions.toggleStudentFlag) return;
    setActionError(null);
    const previous = studentFlagged;
    setStudentFlagged(!previous);

    startTransition(async () => {
      const result = await actions.toggleStudentFlag!(String(application.id));
      if (!result.ok) {
        setStudentFlagged(previous);
        setActionError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleAssign() {
    const assignAction = actions.assignAssignee ?? actions.assignAdvisor;
    if (!assignAction) return;
    setActionError(null);

    startTransition(async () => {
      const result = await assignAction(String(application.id), assignSelection);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }

      const unassign = assignSelection === ADMIN_APPLICATIONS_UNASSIGNED_FILTER;
      if (actions.assignAssignee) {
        if (unassign) {
          setAdvisorId("");
          setAdvisorName("Unassigned");
          setOwnerLabel("Unassigned");
        } else if (assignSelection.startsWith("admin:")) {
          const adminId = assignSelection.slice("admin:".length);
          const selected = adminOptions.find((option) => option.id === adminId);
          setAdvisorId("");
          setAdvisorName("Unassigned");
          setOwnerLabel(selected ? `${selected.label} (Admin)` : "Admin");
        } else if (assignSelection.startsWith("advisor:")) {
          const nextAdvisorId = assignSelection.slice("advisor:".length);
          const selected = advisorOptions.find((option) => option.id === nextAdvisorId);
          setAdvisorId(nextAdvisorId);
          setAdvisorName(selected?.label ?? "Advisor");
          setOwnerLabel(selected ? `${selected.label} (Advisor)` : "Advisor");
        }
      } else {
        const selected = advisorOptions.find((option) => option.id === assignSelection);
        setAdvisorId(unassign ? "" : assignSelection);
        setAdvisorName(unassign ? "Unassigned" : (selected?.label ?? "Advisor"));
        setOwnerLabel(unassign ? "Unassigned" : (selected?.label ?? "Advisor"));
      }

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
        {config.canEditIntake && intakeEdit ? (
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setIntakeEditOpen(true)}
              className={headerQuickActionPrimaryClass}
            >
              Edit application support
            </button>
          </div>
        ) : null}
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
    tabBody =
      config.documentsPortal === "advisor" ? (
        <AdvisorStudentDocumentsTab
          studentId={student.id}
          initialDocuments={studentDocuments}
        />
      ) : (
        <AdminStudentDocumentsTab
          studentId={student.id}
          initialDocuments={studentDocuments}
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
            disabled={isPending || !hasStudentEmail || paymentRequestBlocked}
            onClick={handleOpenPaymentRequest}
            className="cursor-pointer rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-3 py-1.5 text-[11.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send Payment Request
          </button>
        }
      >
        {paymentRequestBlocked ? (
          <p className="mb-3 text-[12px] text-[var(--text-light)]">
            A payment request is already pending for this application.
          </p>
        ) : null}
        {paymentRequestMessage ? (
          <p className="mb-3 text-[12px] font-medium text-[var(--green-dark)]">
            {paymentRequestMessage}
          </p>
        ) : null}
        {config.showPayoutSummary && !config.showPayoutsTab && payoutSummary ? (
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
                  <th className="px-4 py-3">Due date</th>
                  <th className="px-4 py-3">Requested at</th>
                  {!config.showPayoutsTab ? (
                    <>
                      <th className="px-4 py-3">Payout %</th>
                      <th className="px-4 py-3">Payout (AED)</th>
                      <th className="px-4 py-3">Payout status</th>
                    </>
                  ) : null}
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
                      {formatDate(payment.dueDate)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text-mid)]">
                      {formatDate(payment.requestedAt ?? payment.createdAt)}
                    </td>
                    {!config.showPayoutsTab ? (
                      <>
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
                      </>
                    ) : null}
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text-mid)]">
                      {formatDate(
                        payment.status === "paid" ? payment.paidAt : null,
                      )}
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
    tabBody =
      config.payoutsTabVariant === "advisor" && payoutSummary ? (
        <AdvisorApplicationPayoutsTab
          applicationId={application.id}
          payouts={applicationPayouts}
          payoutSummary={payoutSummary}
        />
      ) : (
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
        onCreateOpenChange={(open) => {
          if (open) setLogCallError(null);
          setLogCallOpen(open);
        }}
        isCreatePending={isPending}
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
    const noteVisibilityHint =
      newNoteVisibility === "public"
        ? "Also visible to the student's school counselors in the Teacher Portal."
        : "Visible to platform admins and the assigned advisor only.";

    tabBody = (
      <SchoolStudentPanel
        head="Application notes"
        sub={
          config.notesSub ??
          "Internal notes are staff-only; public notes are also shared with school counselors."
        }
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
            placeholder="Add a note… (Cmd+Enter to save)"
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
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-[5px]">
                {(["internal", "public"] as const).map((option) => {
                  const active = newNoteVisibility === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={isPending}
                      onClick={() => setNewNoteVisibility(option)}
                      className={`cursor-pointer rounded-[8px] border px-[9px] py-1 text-[11px] font-medium capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
                        active
                          ? "border-[var(--green-light)] bg-[var(--green-pale)] text-[var(--green-dark)]"
                          : "border-[var(--border)] bg-white text-[var(--text-mid)]"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-[var(--text-hint)]">{noteVisibilityHint}</p>
            </div>
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
                    {" · "}
                    <span className="inline-flex items-center rounded-[20px] border border-[var(--border)] px-2 py-0.5 text-[10.5px] font-semibold capitalize text-[var(--text-mid)]">
                      {note.visibility}
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
        sub={
          config.activitySub ??
          "All platform events recorded for this application"
        }
      />
    );
  }

  return (
    <div className="min-w-0 w-full max-w-full">
      <div className="mb-3.5 flex min-w-0 w-full flex-wrap items-start justify-between gap-3">
        <Link
          href={config.backHref}
          className="sd-back inline-flex shrink-0 cursor-pointer items-center gap-1.5 py-1.5 text-[12.5px] font-medium text-[var(--text-mid)] hover:text-[var(--green)] [&_svg]:h-[13px] [&_svg]:w-[13px]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {config.backLabel}
        </Link>

        <div className="flex min-w-0 max-w-full flex-wrap items-end justify-end gap-3">
          {config.showHeaderQuickActions ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setAddNoteError(null);
                  setAddNoteOpen(true);
                }}
                className={headerQuickActionOutlineClass}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-[14px] w-[14px]">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                Add Note
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setLogCallError(null);
                  setLogCallOpen(true);
                }}
                className={headerQuickActionOutlineClass}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-[14px] w-[14px]">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                Log Call
              </button>
              {config.canEditIntake && intakeEdit ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setIntakeEditOpen(true)}
                  className={headerQuickActionPrimaryClass}
                >
                  Edit intake
                </button>
              ) : null}
              {hasStudentEmail ? (
                <a
                  href={`mailto:${application.studentEmail}`}
                  className={headerQuickActionOutlineClass}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-[14px] w-[14px]">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  Email
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  title="No email on file"
                  className={headerQuickActionOutlineClass}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-[14px] w-[14px]">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  Email
                </button>
              )}
              <button
                type="button"
                disabled={isPending || !actions.toggleStudentFlag}
                onClick={handleToggleStudentFlag}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border px-3 py-[7px] text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  studentFlagged
                    ? "border-[#f0c4c4] bg-[#FCEBEB] text-[#E74C3C] hover:opacity-90"
                    : "border-[#e0deda] bg-white text-[#4a4a4a] hover:border-[var(--green-light)] hover:bg-[var(--green-pale)] hover:text-[var(--green-dark)]"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-[14px] w-[14px]">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" x2="4" y1="22" y2="15" />
                </svg>
                Flag
              </button>
              <button
                type="button"
                disabled={isPending || !hasStudentEmail || paymentRequestBlocked}
                onClick={handleOpenPaymentRequest}
                className={headerQuickActionPrimaryClass}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-[14px] w-[14px]">
                  <line x1="22" x2="11" y1="2" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                Payment Request
              </button>
            </div>
          ) : null}

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
                setAssignSelection(resolveAssigneeSelection(payload));
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

      <div className="sd-grid grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[280px_minmax(0,1fr)] xl:gap-5">
        <aside className="sd-side flex min-w-0 flex-col gap-3.5 rounded-[14px] border border-[var(--border-light)] bg-white p-[22px] xl:sticky xl:top-[80px]">
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

        <div className="sd-main flex min-w-0 flex-col gap-[18px]">
          <div className="sd-tabs flex flex-wrap gap-0.5 rounded-[10px] border border-[var(--border-light)] bg-white p-1">
            {tabDefs.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => switchTab(t.id)}
                  className={`cursor-pointer rounded-[8px] px-3.5 py-2 text-[12.5px] font-semibold transition-colors ${
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
              Assign owner
            </h3>
            <p className="mt-1 text-[12px] text-[var(--text-light)]">
              Choose the admin or advisor responsible for this application case.
            </p>

            <label
              htmlFor="assign-advisor-select"
              className="mt-4 mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]"
            >
              Admin / Advisor
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
              {actions.assignAssignee ? (
                <>
                  <optgroup label="Admins">
                    {adminOptions.map((option) => (
                      <option
                        key={option.id}
                        value={adminAssigneeOptionValue("admin", option.id)}
                      >
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Advisors">
                    {advisorOptions.map((option) => (
                      <option
                        key={option.id}
                        value={adminAssigneeOptionValue("advisor", option.id)}
                      >
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                </>
              ) : (
                advisorOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))
              )}
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

      {paymentRequestContext ? (
        <SendPaymentRequestDialog
          open={paymentRequestOpen}
          onClose={() => {
            if (!isPending) setPaymentRequestOpen(false);
          }}
          fixedApplication={paymentRequestContext.fixedApplication}
          availablePlans={paymentRequestContext.availablePlans}
          senderName={paymentRequestContext.senderName}
          senderEmail={paymentRequestContext.senderEmail}
          fromEmailDisplay={paymentRequestContext.fromEmailDisplay}
          onSubmit={handleSendPaymentRequest}
          isSubmitting={isPending}
          error={paymentRequestError}
        />
      ) : null}

      <AddApplicationInternalNoteDialog
        open={addNoteOpen}
        onClose={() => {
          if (!isPending) setAddNoteOpen(false);
        }}
        onSubmit={handleAddNoteFromDialog}
        isSubmitting={isPending}
        error={addNoteError}
      />

      <LogApplicationCallDialog
        open={logCallOpen}
        mode="create"
        studentName={student.fullName}
        onClose={() => {
          if (!isPending) setLogCallOpen(false);
        }}
        onSubmit={handleLogCall}
        isSubmitting={isPending}
        error={logCallError}
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

      {config.canEditIntake && intakeEdit ? (
        <ApplicationSupportIntakeDialog
          open={intakeEditOpen}
          applicationId={application.id}
          studentName={application.studentName}
          initialPayload={intakeEdit.initialPayload}
          onClose={() => setIntakeEditOpen(false)}
          onSaved={() => router.refresh()}
          onSubmit={
            actions.updateIntake
              ? (applicationId, payload) => actions.updateIntake!(applicationId, payload)
              : undefined
          }
        />
      ) : null}
    </div>
  );
}
