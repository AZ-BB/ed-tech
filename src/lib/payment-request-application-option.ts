import type { SendPaymentRequestApplicationOption } from "@/components/application-support/send-payment-request-dialog";
import {
  parseApplicationPackageData,
  resolveApplicationUniversitiesTotal,
} from "@/lib/application-package-data";
import { hasActivePendingPaymentRequest } from "@/lib/payment-request-utils";

export type PaymentRequestApplicationRowInput = {
  id: number;
  plan_id: number;
  student_name: string | null;
  student_email: string | null;
  package_data: unknown;
  applications_plans:
    | { name: string; price: number; universities_count: number }
    | { name: string; price: number; universities_count: number }[]
    | null;
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

type PaymentEmbedRow = {
  status: string | null;
  amount: number;
  due_date: string | null;
  payment_request_sent_at: string | null;
  payment_request_token: string | null;
};

function normalizePaymentsEmbed(
  embed: PaymentRequestApplicationRowInput["payments"],
): PaymentEmbedRow[] {
  if (!embed) return [];
  return Array.isArray(embed) ? embed : [embed];
}

export function mapApplicationToPaymentRequestOption(
  row: PaymentRequestApplicationRowInput,
): SendPaymentRequestApplicationOption {
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
  const plan = firstEmbed(row.applications_plans);
  const planPrice =
    plan && Number.isFinite(plan.price) && plan.price > 0 ? plan.price : 0;
  const packageData = parseApplicationPackageData(row.package_data);
  const universitiesTotal = resolveApplicationUniversitiesTotal(
    packageData,
    plan?.universities_count ?? 0,
  );
  const payments = normalizePaymentsEmbed(row.payments);
  const totalPaid = payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const totalPaymentsAed = payments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );

  return {
    applicationId: row.id,
    planId: row.plan_id,
    studentName,
    studentFirstName,
    studentEmail,
    planPrice,
    universitiesTotal,
    totalPaid,
    totalPaymentsAed,
    hasPendingPaymentRequest: hasActivePendingPaymentRequest(payments),
    label: `${studentName} — Application #${row.id}`,
  };
}
