import { resolveActivePendingPaymentRequest } from "@/lib/payment-request-utils";
import type { SendPostAdmissionPaymentRequestOption } from "@/components/post-admission-support/send-post-admission-payment-request-dialog";

export type PaymentRequestPostAdmissionRowInput = {
  id: number;
  student_id: string;
  status?: string | null;
  student_name: string | null;
  student_email: string | null;
  updated_at?: string;
  student_profiles:
    | { first_name: string; last_name: string; email?: string | null }
    | { first_name: string; last_name: string; email?: string | null }[]
    | null;
  payments:
    | {
        status: string | null;
        amount: number;
        due_date: string | null;
        payment_request_sent_at: string | null;
        payment_request_token: string | null;
      }
    | {
        status: string | null;
        amount: number;
        due_date: string | null;
        payment_request_sent_at: string | null;
        payment_request_token: string | null;
      }[]
    | null;
};

function firstEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

function personName(
  first: string | null | undefined,
  last: string | null | undefined,
): string {
  return [first?.trim(), last?.trim()].filter(Boolean).join(" ").trim();
}

function normalizePaymentsEmbed(
  embed: PaymentRequestPostAdmissionRowInput["payments"],
) {
  if (!embed) return [];
  return Array.isArray(embed) ? embed : [embed];
}

export function mapPostAdmissionToPaymentRequestOption(
  row: PaymentRequestPostAdmissionRowInput,
): SendPostAdmissionPaymentRequestOption {
  const profile = firstEmbed(row.student_profiles);
  const profileName = profile
    ? personName(profile.first_name, profile.last_name)
    : "";
  const studentFirstName =
    profile?.first_name?.trim() ||
    row.student_name?.trim().split(/\s+/)[0] ||
    "Student";
  const studentName = profileName || row.student_name?.trim() || "Student";
  const studentEmail =
    profile?.email?.trim() || row.student_email?.trim() || "";
  const payments = normalizePaymentsEmbed(row.payments);
  const pendingPayment = resolveActivePendingPaymentRequest(payments);

  return {
    caseId: row.id,
    studentName,
    studentFirstName,
    studentEmail,
    hasPendingPaymentRequest: pendingPayment != null,
    pendingPaymentAmountAed: pendingPayment?.amount ?? null,
    pendingPaymentDueDate: pendingPayment?.dueDate ?? null,
    label: `${studentName} — Post-admission #${row.id}`,
  };
}

/** Latest non–not-suitable post-admission case per student (rows must be newest first). */
export function pickLatestPaymentRequestPostAdmissionPerStudent<
  T extends { student_id: string; status?: string | null },
>(rows: T[]): T[] {
  const seenStudentIds = new Set<string>();
  const picked: T[] = [];

  for (const row of rows) {
    const status = row.status?.trim() || "lead";
    if (status === "not_suitable") continue;
    if (seenStudentIds.has(row.student_id)) continue;
    seenStudentIds.add(row.student_id);
    picked.push(row);
  }

  return picked;
}
