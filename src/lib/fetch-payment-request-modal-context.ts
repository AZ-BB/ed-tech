import type { ApplicationPlanCatalogRow } from "@/lib/applications-plans";
import { fetchActiveApplicationPlans } from "@/lib/applications-plans";
import {
  parseApplicationPackageData,
  resolveApplicationUniversitiesTotal,
} from "@/lib/application-package-data";
import { resolvePaymentFromEmailDisplay } from "@/lib/resend/application-payment-request-email";
import { resolveActivePendingPaymentRequest } from "@/lib/payment-request-utils";
import type { SendPaymentRequestApplicationOption } from "@/components/application-support/send-payment-request-dialog";
import type { createSupabaseServerClient } from "@/utils/supabase-server";

type DbClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

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

export type PaymentRequestModalContext = {
  availablePlans: ApplicationPlanCatalogRow[];
  senderName: string;
  senderEmail: string;
  fromEmailDisplay: string;
  fixedApplication: SendPaymentRequestApplicationOption;
};

export async function buildPaymentRequestModalContext(
  client: DbClient,
  application: {
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
  },
  payments: {
    status: string | null;
    amount: number;
    due_date?: string | null;
    payment_request_sent_at?: string | null;
    payment_request_token?: string | null;
  }[],
  sender: { name: string; email: string },
): Promise<PaymentRequestModalContext> {
  const profile = firstEmbed(application.student_profiles);
  const profileName = profile ? personName(profile.first_name, profile.last_name) : "";
  const studentFirstName =
    profile?.first_name?.trim() ||
    application.student_name?.trim().split(/\s+/)[0] ||
    "Student";
  const studentName = profileName || application.student_name?.trim() || "Student";
  const studentEmail = profile?.email?.trim() || application.student_email?.trim() || "";
  const plan = firstEmbed(application.applications_plans);
  const planPrice =
    plan && Number.isFinite(plan.price) && plan.price > 0 ? plan.price : 0;
  const packageData = parseApplicationPackageData(application.package_data);
  const universitiesTotal = resolveApplicationUniversitiesTotal(
    packageData,
    plan?.universities_count ?? 0,
  );
  const totalPaid = payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const totalPaymentsAed = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const pendingPayment = resolveActivePendingPaymentRequest(payments);

  const availablePlans = await fetchActiveApplicationPlans(client);

  return {
    availablePlans,
    senderName: sender.name,
    senderEmail: sender.email,
    fromEmailDisplay: resolvePaymentFromEmailDisplay(),
    fixedApplication: {
      applicationId: application.id,
      planId: application.plan_id,
      studentName,
      studentFirstName,
      studentEmail,
      planPrice,
      universitiesTotal,
      totalPaid,
      totalPaymentsAed,
      hasPendingPaymentRequest: pendingPayment != null,
      pendingPaymentAmountAed: pendingPayment?.amount ?? null,
      pendingPaymentDueDate: pendingPayment?.dueDate ?? null,
      label: `${studentName} — Application #${application.id}`,
    },
  };
}
