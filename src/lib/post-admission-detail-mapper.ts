import type { Database } from "@/database.types";
import type { PostAdmissionCallRow } from "@/lib/fetch-post-admission-calls";
import type { PostAdmissionInternalNoteRow } from "@/lib/post-admission-internal-notes";
import type { PostAdmissionStatus } from "@/lib/post-admission-status-transitions";

export type PostAdmissionPaymentRow = {
  id: number;
  amount: number;
  status: string | null;
  dueDate: string | null;
  paidAt: string | null;
  paymentRequestSentAt: string | null;
  paymentRequestToken: string | null;
};

export type PostAdmissionDetailPayload = {
  case: {
    id: number;
    status: PostAdmissionStatus;
    studentName: string | null;
    studentEmail: string | null;
    schoolName: string | null;
    selectedService: string | null;
    serviceOtherDetail: string | null;
    scheduledAt: string | null;
    assignedAt: string | null;
    createdAt: string | null;
    paymentInProgressAt: string | null;
    paymentCompletedAt: string | null;
    completedAt: string | null;
    blockedAt: string | null;
  };
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    schoolId: string | null;
  } | null;
  school: { id: string; name: string } | null;
  advisor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  payments: PostAdmissionPaymentRow[];
  internalNotes: PostAdmissionInternalNoteRow[];
  calls: PostAdmissionCallRow[];
};

type CaseRow = Database["public"]["Tables"]["post_admission_cases"]["Row"];
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
type PaymentSelectRow = Pick<
  PaymentRow,
  | "id"
  | "amount"
  | "status"
  | "due_date"
  | "paid_at"
  | "payment_request_sent_at"
  | "payment_request_token"
>;

function firstEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

function mapPaymentRow(row: PaymentSelectRow): PostAdmissionPaymentRow {
  return {
    id: row.id,
    amount: row.amount,
    status: row.status,
    dueDate: row.due_date,
    paidAt: row.paid_at,
    paymentRequestSentAt: row.payment_request_sent_at,
    paymentRequestToken: row.payment_request_token,
  };
}

export function mapPostAdmissionDetailPayload(input: {
  caseRow: CaseRow;
  student: PostAdmissionDetailPayload["student"];
  school: PostAdmissionDetailPayload["school"];
  advisor: PostAdmissionDetailPayload["advisor"];
  payments: PaymentSelectRow[];
  internalNotes: PostAdmissionInternalNoteRow[];
  calls: PostAdmissionCallRow[];
}): PostAdmissionDetailPayload {
  const { caseRow } = input;
  return {
    case: {
      id: caseRow.id,
      status: (caseRow.status ?? "lead") as PostAdmissionStatus,
      studentName: caseRow.student_name,
      studentEmail: caseRow.student_email,
      schoolName: caseRow.school_name,
      selectedService: caseRow.selected_service,
      serviceOtherDetail: caseRow.service_other_detail,
      scheduledAt: caseRow.scheduled_at,
      assignedAt: caseRow.assigned_at,
      createdAt: caseRow.created_at,
      paymentInProgressAt: caseRow.payment_in_progress_at,
      paymentCompletedAt: caseRow.payment_completed_at,
      completedAt: caseRow.completed_at,
      blockedAt: caseRow.blocked_at,
    },
    student: input.student,
    school: input.school,
    advisor: input.advisor,
    payments: input.payments.map(mapPaymentRow),
    internalNotes: input.internalNotes,
    calls: input.calls,
  };
}

export { firstEmbed };
