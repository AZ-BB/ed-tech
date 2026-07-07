"use client";

import { SchoolStudentActivityLogsTab } from "@/app/(protected)/school/students/[id]/_components/school-student-activity-logs-tab";
import { SchoolStudentPanel } from "@/app/(protected)/school/students/[id]/_components/school-student-panel";
import {
  ADMIN_APPLICATIONS_UNASSIGNED_FILTER,
  type AdminApplicationAdvisorOption,
} from "@/app/(protected)/admin/applications/_lib/fetch-admin-application-advisor-options";
import { AdminApplicationPayoutsTab } from "@/app/(protected)/admin/applications/[id]/_components/admin-application-payouts-tab";
import { AdvisorApplicationPayoutsTab } from "@/app/(protected)/advisor/applications/[id]/_components/advisor-application-payouts-tab";
import { parsePostAdmissionDetailTab } from "@/app/(protected)/admin/post-admission/[id]/_lib/parse-post-admission-detail-search-params";
import type { PostAdmissionDetailTab } from "@/app/(protected)/admin/post-admission/[id]/_lib/parse-post-admission-detail-search-params";
import { AddApplicationInternalNoteDialog } from "@/components/application-support/add-application-internal-note-dialog";
import {
  LogApplicationCallDialog,
  type LogApplicationCallFormData,
} from "@/components/application-support/log-application-call-dialog";
import {
  SendPostAdmissionPaymentRequestDialog,
  type PostAdmissionSendPaymentRequestInput,
} from "@/components/post-admission-support/send-post-admission-payment-request-dialog";
import type { ApplicationPayoutRow } from "@/lib/advisor-payouts/types";
import type { ApplicationPayoutSummary } from "@/lib/advisor-payouts/types";
import {
  APPLICATION_CALL_OUTCOME_LABEL,
  APPLICATION_CALL_STATUS_LABEL,
  APPLICATION_CALL_TYPE_LABEL,
} from "@/lib/application-call-constants";
import type { PostAdmissionDetailPayload } from "@/lib/post-admission-detail-mapper";
import type { PostAdmissionNoteVisibility } from "@/lib/post-admission-internal-notes";
import { hasActivePendingPaymentRequest, resolveActivePendingPaymentRequest } from "@/lib/payment-request-utils";
import {
  POST_ADMISSION_STATUS_FILTER_OPTIONS,
  POST_ADMISSION_STATUS_LABEL,
  postAdmissionStatusPillClass,
  type PostAdmissionStatus,
} from "@/lib/post-admission-status-labels";
import type { StudentActivityLogsPanelProps } from "@/lib/student-activity-logs";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

type ActionResult = { ok: true } | { ok: false; error: string };
type PaymentActionResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

export type PostAdmissionViewConfig = {
  backHref: string;
  backLabel: string;
  canAssignAdvisor: boolean;
  showPayoutsTab: boolean;
  payoutsTabVariant?: "admin" | "advisor";
  notesSub?: string;
  activitySub?: string;
  blockPaymentRequestIfPending?: boolean;
};

export type PostAdmissionViewActions = {
  updateStatus: (caseId: string, status: string) => Promise<ActionResult>;
  addInternalNote: (
    caseId: string,
    content: string,
    visibility?: PostAdmissionNoteVisibility,
  ) => Promise<ActionResult>;
  sendPaymentRequest: (
    input: PostAdmissionSendPaymentRequestInput,
  ) => Promise<PaymentActionResult>;
  assignAdvisor?: (caseId: string, advisorId: string) => Promise<ActionResult>;
  logCall: (input: {
    caseId: string;
    callType: string;
    durationMinutes: number;
    callDate: string;
    status: string;
    outcome: string | null;
    summary: string | null;
  }) => Promise<ActionResult>;
};

export type PostAdmissionViewClientProps = {
  payload: PostAdmissionDetailPayload;
  activityLogsPanel: StudentActivityLogsPanelProps;
  config: PostAdmissionViewConfig;
  actions: PostAdmissionViewActions;
  advisorOptions?: AdminApplicationAdvisorOption[];
  initialTab?: PostAdmissionDetailTab;
  postAdmissionPayouts?: ApplicationPayoutRow[];
  payoutSummary?: ApplicationPayoutSummary | null;
  paymentSender: { name: string; email: string };
  fromEmailDisplay: string;
  studentFirstName: string;
};

const SELECT_CHEVRON =
  'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237a7a7a\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")';

const headerSelectClass =
  "min-w-[140px] cursor-pointer appearance-none rounded-[8px] border border-[#e0deda] bg-white bg-[length:10px_6px] bg-[position:right_8px_center] bg-no-repeat py-[7px] pl-[10px] pr-9 text-[12px] text-[#4a4a4a] outline-none transition-colors focus:border-[#40916C] disabled:cursor-not-allowed disabled:opacity-60";

const BASE_TAB_DEFS: { id: PostAdmissionDetailTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "notes", label: "Notes" },
  { id: "payments", label: "Payments" },
  { id: "calls", label: "Calls" },
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

function resolveTab(rawTab: string | null, config: PostAdmissionViewConfig): PostAdmissionDetailTab {
  const parsed = parsePostAdmissionDetailTab(rawTab ?? undefined);
  if (parsed === "payouts" && !config.showPayoutsTab) return "payments";
  return parsed;
}

export function PostAdmissionViewClient({
  payload,
  activityLogsPanel,
  config,
  actions,
  advisorOptions = [],
  initialTab = "overview",
  postAdmissionPayouts = [],
  payoutSummary = null,
  paymentSender,
  fromEmailDisplay,
  studentFirstName,
}: PostAdmissionViewClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<PostAdmissionDetailTab>(() =>
    resolveTab(searchParams.get("tab"), config),
  );
  const [status, setStatus] = useState(payload.case.status);
  const [advisorId, setAdvisorId] = useState(payload.advisor?.id ?? "");
  const [advisorName, setAdvisorName] = useState(
    payload.advisor
      ? [payload.advisor.firstName, payload.advisor.lastName].filter(Boolean).join(" ").trim() ||
          "Advisor"
      : "Unassigned",
  );
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSelection, setAssignSelection] = useState(
    payload.advisor?.id ?? ADMIN_APPLICATIONS_UNASSIGNED_FILTER,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [paymentRequestMessage, setPaymentRequestMessage] = useState<string | null>(null);
  const [paymentRequestOpen, setPaymentRequestOpen] = useState(false);
  const [paymentRequestError, setPaymentRequestError] = useState<string | null>(null);
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [addNoteError, setAddNoteError] = useState<string | null>(null);
  const [logCallOpen, setLogCallOpen] = useState(false);
  const [logCallError, setLogCallError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { case: caseRow, student, school, payments, internalNotes, calls } = payload;

  const studentName =
    caseRow.studentName?.trim() ||
    (student ? [student.firstName, student.lastName].filter(Boolean).join(" ").trim() : "") ||
    "Student";
  const studentEmail = caseRow.studentEmail?.trim() || student?.email?.trim() || "—";
  const schoolName = school?.name?.trim() || caseRow.schoolName?.trim() || "—";

  const tabDefs = useMemo(() => {
    if (!config.showPayoutsTab) return BASE_TAB_DEFS;
    const next = [...BASE_TAB_DEFS];
    const paymentsIndex = next.findIndex((tabDef) => tabDef.id === "payments");
    next.splice(paymentsIndex + 1, 0, { id: "payouts", label: "Payouts" });
    return next;
  }, [config.showPayoutsTab]);

  const statusOptions = POST_ADMISSION_STATUS_FILTER_OPTIONS.filter(
    (option) => option.value !== "all",
  );

  const hasStudentEmail = studentEmail.trim() !== "" && studentEmail !== "—";
  const hasPendingPaymentRequest = useMemo(
    () => hasActivePendingPaymentRequest(payments),
    [payments],
  );
  const pendingPaymentRequest = useMemo(
    () => resolveActivePendingPaymentRequest(payments),
    [payments],
  );
  const paymentRequestBlocked =
    config.blockPaymentRequestIfPending === true && hasPendingPaymentRequest;

  useEffect(() => {
    setStatus(payload.case.status);
    setAdvisorId(payload.advisor?.id ?? "");
    setAdvisorName(
      payload.advisor
        ? [payload.advisor.firstName, payload.advisor.lastName].filter(Boolean).join(" ").trim() ||
            "Advisor"
        : "Unassigned",
    );
    setAssignSelection(payload.advisor?.id ?? ADMIN_APPLICATIONS_UNASSIGNED_FILTER);
  }, [payload]);

  useEffect(() => {
    const fromUrl = resolveTab(searchParams.get("tab"), config);
    setTab((current) => (current === fromUrl ? current : fromUrl));
  }, [searchParams, config.showPayoutsTab]);

  const switchTab = useCallback(
    (next: PostAdmissionDetailTab) => {
      setTab(next);
      const nextParams = new URLSearchParams(searchParams.toString());
      if (next === "overview") {
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
    const parts = studentName.trim().split(/\s+/);
    const a = parts[0]?.[0] ?? "";
    const b = parts[1]?.[0] ?? "";
    const pair = `${a}${b}`.toUpperCase();
    return pair || "?";
  }, [studentName]);

  function handleStatusChange(nextStatus: string) {
    setActionError(null);
    const previous = status;
    setStatus(nextStatus as PostAdmissionStatus);

    startTransition(async () => {
      const result = await actions.updateStatus(String(caseRow.id), nextStatus);
      if (!result.ok) {
        setStatus(previous);
        setActionError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleAddNoteFromDialog(content: string, visibility: PostAdmissionNoteVisibility) {
    setActionError(null);
    setAddNoteError(null);
    if (!content) {
      setAddNoteError("Note cannot be empty.");
      return;
    }

    startTransition(async () => {
      const result = await actions.addInternalNote(String(caseRow.id), content, visibility);
      if (!result.ok) {
        setAddNoteError(result.error);
        return;
      }
      setAddNoteOpen(false);
      router.refresh();
    });
  }

  function handleOpenPaymentRequest() {
    setActionError(null);
    setPaymentRequestMessage(null);
    setPaymentRequestError(null);
    setPaymentRequestOpen(true);
  }

  function handleSendPaymentRequest(input: PostAdmissionSendPaymentRequestInput) {
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

  function handleLogCall(form: LogApplicationCallFormData) {
    setActionError(null);
    setLogCallError(null);
    const durationMinutes = Number.parseInt(form.durationMinutes.trim(), 10);

    startTransition(async () => {
      const result = await actions.logCall({
        caseId: String(caseRow.id),
        callType: form.callType,
        durationMinutes,
        callDate: form.callDate,
        status: form.status,
        outcome: form.outcome || null,
        summary: form.summary.trim() || null,
      });

      if (!result.ok) {
        setLogCallError(result.error);
        return;
      }
      setLogCallOpen(false);
      router.refresh();
    });
  }

  function handleAssign() {
    const assignAdvisor = actions.assignAdvisor;
    if (!assignAdvisor) return;
    setActionError(null);

    startTransition(async () => {
      const nextAdvisorId =
        assignSelection === ADMIN_APPLICATIONS_UNASSIGNED_FILTER ? "" : assignSelection;
      if (!nextAdvisorId) {
        setActionError("Select an advisor.");
        return;
      }

      const result = await assignAdvisor(String(caseRow.id), nextAdvisorId);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      setAssignOpen(false);
      router.refresh();
    });
  }

  let tabBody: React.ReactNode = null;

  if (tab === "overview") {
    tabBody = (
      <SchoolStudentPanel head="Case overview" sub={`Post-admission support case #${caseRow.id}`}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SnapItem label="Status" value={POST_ADMISSION_STATUS_LABEL[status] ?? status} />
          <SnapItem label="Advisor" value={advisorName} />
          <SnapItem label="School" value={schoolName} />
          <SnapItem label="Meeting scheduled" value={formatDateTime(caseRow.scheduledAt)} />
          <SnapItem label="Assigned at" value={formatDateTime(caseRow.assignedAt)} />
          <SnapItem label="Created" value={formatDateTime(caseRow.createdAt)} />
          <SnapItem label="Payment completed" value={formatDateTime(caseRow.paymentCompletedAt)} />
          <SnapItem label="Completed" value={formatDateTime(caseRow.completedAt)} />
        </div>
      </SchoolStudentPanel>
    );
  } else if (tab === "notes") {
    tabBody = (
      <SchoolStudentPanel
        head="Case notes"
        sub={config.notesSub ?? "Internal notes for this post-admission case"}
        actions={
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setAddNoteError(null);
              setAddNoteOpen(true);
            }}
            className="cursor-pointer rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-3 py-1.5 text-[11.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add note
          </button>
        }
      >
        {internalNotes.length === 0 ? (
          <p className="text-[13px] text-[var(--text-light)]">No notes yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {internalNotes.map((note) => (
              <li
                key={note.id}
                className="rounded-[10px] border border-[var(--border-light)] bg-[#faf9f4] px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold text-[var(--text)]">
                    {note.authorName}
                    <span className="ml-1.5 font-normal text-[var(--text-light)]">
                      · {note.authorRole}
                    </span>
                  </span>
                  <span className="text-[11px] text-[var(--text-light)]">
                    {formatDateTime(note.createdAt)}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[13px] text-[var(--text-mid)]">
                  {note.content}
                </p>
                <span className="mt-2 inline-flex rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold capitalize text-[var(--text-light)]">
                  {note.visibility}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SchoolStudentPanel>
    );
  } else if (tab === "payments") {
    tabBody = (
      <SchoolStudentPanel
        head="Payments"
        sub="Send a payment request for post-admission support"
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
            A payment request is already pending for this case.
          </p>
        ) : null}
        {paymentRequestMessage ? (
          <p className="mb-3 text-[12px] font-medium text-[var(--green-dark)]">
            {paymentRequestMessage}
          </p>
        ) : null}
        {payments.length === 0 ? (
          <p className="text-[13px] text-[var(--text-light)]">
            No payment request has been sent yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--border-light)]">
            <table className="w-full min-w-[520px] border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  <th className="px-4 py-3">Amount (AED)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Due date</th>
                  <th className="px-4 py-3">Requested at</th>
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
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${paymentStatusClass(payment.status ?? "pending")}`}
                      >
                        {payment.status ?? "pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text-mid)]">
                      {formatDate(payment.dueDate)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text-mid)]">
                      {formatDate(payment.paymentRequestSentAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text-mid)]">
                      {formatDate(payment.status === "paid" ? payment.paidAt : null)}
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
          applicationId={caseRow.id}
          payouts={postAdmissionPayouts}
          payoutSummary={payoutSummary}
        />
      ) : (
        <AdminApplicationPayoutsTab
          applicationId={caseRow.id}
          payouts={postAdmissionPayouts}
        />
      );
  } else if (tab === "calls") {
    tabBody = (
      <SchoolStudentPanel
        head="Calls"
        sub="Logged sessions for this post-admission case"
        actions={
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setLogCallError(null);
              setLogCallOpen(true);
            }}
            className="cursor-pointer rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-3 py-1.5 text-[11.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Log call
          </button>
        }
      >
        {calls.length === 0 ? (
          <p className="text-[13px] text-[var(--text-light)]">No calls logged yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--border-light)]">
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#faf9f4] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3">Logged by</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => (
                  <tr
                    key={call.id}
                    className="border-t border-[var(--border-light)] hover:bg-[#faf9f4]"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text-mid)]">
                      {formatDate(call.callDate)}
                    </td>
                    <td className="px-4 py-3 text-[var(--text)]">
                      {APPLICATION_CALL_TYPE_LABEL[call.callType] ?? call.callType}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-mid)]">
                      {call.durationMinutes} min
                    </td>
                    <td className="px-4 py-3 text-[var(--text-mid)]">
                      {APPLICATION_CALL_STATUS_LABEL[call.status] ?? call.status}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-mid)]">
                      {call.outcome
                        ? APPLICATION_CALL_OUTCOME_LABEL[call.outcome] ?? call.outcome
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-mid)]">
                      {call.authorName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SchoolStudentPanel>
    );
  } else if (tab === "activity") {
    tabBody = (
      <SchoolStudentActivityLogsTab
        {...activityLogsPanel}
        head="Activity log"
        sub={config.activitySub ?? "Activity recorded for this post-admission case"}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={config.backHref}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--text-light)] transition-colors hover:text-[var(--green-dark)]"
          >
            ← {config.backLabel}
          </Link>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="post-admission-status"
              className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--text-light)]"
            >
              Status
            </label>
            <select
              id="post-admission-status"
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

      <div className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="flex min-w-0 flex-col gap-3.5 rounded-[14px] border border-[var(--border-light)] bg-white p-[22px] xl:sticky xl:top-[80px]">
          <div className="flex flex-col items-center gap-2.5 border-b border-[var(--border-light)] pb-[18px] text-center">
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-[var(--green-bg)] font-[family-name:var(--font-dm-serif)] text-2xl font-bold text-[var(--green-dark)]">
              {ini}
            </div>
            <div className="font-[family-name:var(--font-dm-serif)] text-xl leading-snug text-[var(--text)]">
              {studentName}
            </div>
            <div className="break-all text-xs text-[var(--text-light)]">{studentEmail}</div>
            <div className="text-xs text-[var(--text-mid)]">{schoolName}</div>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${postAdmissionStatusPillClass(status)}`}
            >
              {POST_ADMISSION_STATUS_LABEL[status] ?? status}
            </span>
          </div>

          <div className="flex justify-between gap-2 py-1 text-[12.5px]">
            <span className="shrink-0 text-[var(--text-light)]">Case #</span>
            <span className="font-medium text-[var(--text)]">{caseRow.id}</span>
          </div>
          <div className="flex justify-between gap-2 py-1 text-[12.5px]">
            <span className="shrink-0 text-[var(--text-light)]">Advisor</span>
            <span className="max-w-[60%] text-right font-medium text-[var(--text)]">
              {advisorName}
            </span>
          </div>
          <div className="flex justify-between gap-2 py-1 text-[12.5px]">
            <span className="shrink-0 text-[var(--text-light)]">Meeting</span>
            <span className="max-w-[60%] text-right font-medium text-[var(--text)]">
              {formatDateTime(caseRow.scheduledAt)}
            </span>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-[18px]">
          <div className="flex flex-wrap gap-0.5 rounded-[10px] border border-[var(--border-light)] bg-white p-1">
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

      <SendPostAdmissionPaymentRequestDialog
        open={paymentRequestOpen}
        onClose={() => {
          if (!isPending) setPaymentRequestOpen(false);
        }}
        onSubmit={handleSendPaymentRequest}
        isSubmitting={isPending}
        error={paymentRequestError}
        caseId={caseRow.id}
        studentName={studentName}
        studentFirstName={studentFirstName}
        studentEmail={hasStudentEmail ? studentEmail : ""}
        senderName={paymentSender.name}
        senderEmail={paymentSender.email}
        fromEmailDisplay={fromEmailDisplay}
        hasPendingPaymentRequest={hasPendingPaymentRequest}
        pendingPaymentAmountAed={pendingPaymentRequest?.amount ?? null}
        pendingPaymentDueDate={pendingPaymentRequest?.dueDate ?? null}
      />

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
        studentName={studentName}
        initialForm={{
          callType: "post_admission_session",
          durationMinutes: "30",
          callDate: new Date().toISOString().slice(0, 10),
          status: "completed",
          outcome: "",
          summary: "",
          createFollowUpTask: false,
          followUpTaskTitle: "",
          followUpTaskDueDate: "",
        }}
        onClose={() => {
          if (!isPending) setLogCallOpen(false);
        }}
        onSubmit={handleLogCall}
        isSubmitting={isPending}
        error={logCallError}
      />

      {assignOpen && config.canAssignAdvisor ? (
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
            className="w-full max-w-[400px] rounded-[12px] border border-[#ece9e4] bg-white p-5 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-[15px] font-semibold text-[var(--text)]">Assign advisor</h3>
            <select
              value={assignSelection}
              disabled={isPending}
              onChange={(event) => setAssignSelection(event.target.value)}
              className={`${headerSelectClass} mt-3 w-full`}
              style={{ backgroundImage: SELECT_CHEVRON }}
            >
              <option value={ADMIN_APPLICATIONS_UNASSIGNED_FILTER}>Unassigned</option>
              {advisorOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setAssignOpen(false)}
                className="cursor-pointer rounded-[8px] border border-[#e0deda] px-3 py-1.5 text-[12px] font-semibold text-[#4a4a4a]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleAssign}
                className="cursor-pointer rounded-[8px] border-[1.5px] border-[var(--green)] bg-[var(--green)] px-3 py-1.5 text-[12px] font-semibold text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
