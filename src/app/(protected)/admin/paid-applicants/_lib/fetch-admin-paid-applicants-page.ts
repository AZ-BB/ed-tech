import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import type { LeadPaymentRequestApplicationOption } from "@/components/application-support/lead-payment-request-dialog";
import {
  parseApplicationPackageData,
  resolveApplicationUniversitiesTotal,
} from "@/lib/application-package-data";
import { hydrateApplicationsPlansEmbeds } from "@/lib/applications-plans";
import {
  mapApplicationToPaymentRequestOption,
  pickLatestPaymentRequestApplicationPerStudent,
  type PaymentRequestApplicationRowInput,
} from "@/lib/payment-request-application-option";
import { expireOverduePendingPayments } from "@/lib/payment-request-utils";
import { resolvePaymentFromEmailDisplay } from "@/lib/resend/application-payment-request-email";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

import type { AdminPaidApplicantsPageFilters } from "./parse-admin-paid-applicants-search-params";

type PaymentEmbed = {
  amount: number;
  status: string | null;
  paid_at: string | null;
};

type PersonEmbed =
  | { first_name: string; last_name: string }
  | { first_name: string; last_name: string }[]
  | null;

type ActivePackageRowRaw = {
  id: number;
  plan_id: number;
  assigned_to: string | null;
  student_name: string | null;
  student_email: string | null;
  status: string | null;
  package_data: unknown;
  applications_plans:
    | { name: string; price: number; universities_count: number }
    | { name: string; price: number; universities_count: number }[]
    | null;
  student_profiles:
    | { first_name: string; last_name: string; email?: string | null }
    | { first_name: string; last_name: string; email?: string | null }[]
    | null;
  advisors: PersonEmbed;
  payments: PaymentEmbed | PaymentEmbed[];
};

export type AdminPaidApplicantTableRow = {
  applicationId: number;
  studentName: string;
  studentInitials: string;
  studentEmail: string;
  advisorId: string | null;
  advisorName: string;
  packagePurchased: string;
  amountPaidAed: number;
  paidOn: string | null;
  statusLabel: "Active" | "Submitted";
};

export type AdminPaidApplicantsPanelProps = {
  rows: AdminPaidApplicantTableRow[];
  totalRows: number;
  page: number;
  limit: number;
  search: string;
  paymentRequestApplications: LeadPaymentRequestApplicationOption[];
  adminName: string;
  adminEmail: string;
  fromEmailDisplay: string;
};

function paginationRange(page: number, limit: number) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const from = (safePage - 1) * safeLimit;
  return { from, to: from + safeLimit - 1 };
}

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

function personNameFromEmbed(embed: PersonEmbed): string | null {
  const person = firstEmbed(embed);
  if (!person) return null;
  const name = personName(person.first_name, person.last_name);
  return name || null;
}

function studentInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  const pair = `${a}${b}`.toUpperCase();
  return pair || "?";
}

function formatPackagePurchased(
  plan: { name: string; universities_count: number } | null,
  packageDataRaw: unknown,
): string {
  if (!plan) return "Application package";
  const packageData = parseApplicationPackageData(packageDataRaw);
  const count = resolveApplicationUniversitiesTotal(
    packageData,
    plan.universities_count,
  );
  if (count > 0) {
    return `${count}-University Application Package`;
  }
  return plan.name?.trim() || "Application package";
}

function mapActivePackageRow(row: ActivePackageRowRaw): AdminPaidApplicantTableRow {
  const profile = firstEmbed(row.student_profiles);
  const profileName = profile ? personName(profile.first_name, profile.last_name) : "";
  const studentName = profileName || row.student_name?.trim() || "Student";
  const studentEmail = profile?.email?.trim() || row.student_email?.trim() || "—";

  const plan = firstEmbed(row.applications_plans);
  const paymentsEmbed = row.payments;
  const payments = Array.isArray(paymentsEmbed)
    ? paymentsEmbed
    : paymentsEmbed
      ? [paymentsEmbed]
      : [];

  const paidPayments = payments.filter((payment) => payment.status === "paid");
  const amountPaidAed = paidPayments.reduce(
    (sum, payment) => sum + (payment.amount ?? 0),
    0,
  );

  const paidOn =
    paidPayments
      .map((payment) => payment.paid_at)
      .filter((value): value is string => Boolean(value))
      .sort()[0] ?? null;

  const advisorId = row.assigned_to?.trim() || null;
  const advisorName = personNameFromEmbed(row.advisors) ?? "—";

  return {
    applicationId: row.id,
    studentName,
    studentInitials: studentInitials(studentName),
    studentEmail,
    advisorId,
    advisorName,
    packagePurchased: formatPackagePurchased(plan, row.package_data),
    amountPaidAed,
    paidOn,
    statusLabel: "Active",
  };
}

async function resolveAdminSender(): Promise<{ name: string; email: string }> {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user?.id) {
    return { name: "Admin", email: "" };
  }

  const secret = await createSupabaseSecretClient();
  const { data: admin } = await secret
    .from("admins")
    .select("first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  const name =
    [admin?.first_name, admin?.last_name].filter(Boolean).join(" ").trim() || "Admin";

  return { name, email: user.email?.trim() || "" };
}

async function fetchAdminPaymentRequestApplicationOptions(
  supabase: Awaited<ReturnType<typeof createSupabaseSecretClient>>,
): Promise<LeadPaymentRequestApplicationOption[]> {
  const { data, error } = await supabase
    .from("applications")
    .select(
      `
      id,
      student_id,
      plan_id,
      status,
      student_name,
      student_email,
      package_data,
      updated_at,
      applications_plans!applications_plan_id_fkey ( name, price, universities_count ),
      student_profiles ( first_name, last_name, email ),
      payments ( status, amount, due_date, payment_request_sent_at, payment_request_token )
    `,
    )
    .neq("status", "not_suitable")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[fetchAdminPaymentRequestApplicationOptions]", error);
    return [];
  }

  const rows = await hydrateApplicationsPlansEmbeds(
    supabase,
    (data ?? []) as unknown as PaymentRequestApplicationRowInput[],
  );

  return pickLatestPaymentRequestApplicationPerStudent(rows).map((row) => {
    const option = mapApplicationToPaymentRequestOption(row);
    return {
      applicationId: option.applicationId,
      studentName: option.studentName,
      studentEmail: option.studentEmail,
      label: option.label,
    };
  });
}

export async function fetchAdminPaidApplicantsPanel(
  filters: AdminPaidApplicantsPageFilters,
): Promise<AdminPaidApplicantsPanelProps> {
  const supabase = await createSupabaseSecretClient();
  const { search, page, limit } = filters;
  const { from, to } = paginationRange(page, limit);

  await expireOverduePendingPayments(supabase);

  const [pageResult, paymentRequestApplications, adminSender] = await Promise.all([
    (async () => {
      let query = supabase
        .from("applications")
        .select(
          `
      id,
      plan_id,
      assigned_to,
      student_name,
      student_email,
      status,
      package_data,
      applications_plans!applications_plan_id_fkey ( name, price, universities_count ),
      student_profiles ( first_name, last_name, email ),
      advisors:assigned_to ( id, first_name, last_name ),
      payments ( amount, status, paid_at )
    `,
          { count: "exact" },
        )
        .eq("status", "active_package")
        .order("updated_at", { ascending: false })
        .order("id", { ascending: false });

      if (search) {
        const e = escapeIlike(search);
        query = query.or(`student_name.ilike.%${e}%,student_email.ilike.%${e}%`);
      }

      const { data, count, error } = await query.range(from, to);

      if (error) {
        console.error("[fetchAdminPaidApplicantsPanel]", error);
        return { rows: [] as AdminPaidApplicantTableRow[], totalRows: 0 };
      }

      const hydratedRows = await hydrateApplicationsPlansEmbeds(
        supabase,
        (data ?? []) as unknown as ActivePackageRowRaw[],
      );

      return {
        rows: hydratedRows.map(mapActivePackageRow),
        totalRows: count ?? 0,
      };
    })(),
    fetchAdminPaymentRequestApplicationOptions(supabase),
    resolveAdminSender(),
  ]);

  return {
    rows: pageResult.rows,
    totalRows: pageResult.totalRows,
    page,
    limit,
    search,
    paymentRequestApplications,
    adminName: adminSender.name,
    adminEmail: adminSender.email,
    fromEmailDisplay: resolvePaymentFromEmailDisplay(),
  };
}
