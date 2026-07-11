import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import {
  fetchActiveApplicationPlans,
  hydrateApplicationsPlansEmbeds,
  type ApplicationPlanCatalogRow,
} from "@/lib/applications-plans";
import {
  parseApplicationPackageData,
  resolveApplicationUniversitiesTotal,
} from "@/lib/application-package-data";
import { mapApplicationToPaymentRequestOption } from "@/lib/payment-request-application-option";
import { expireOverduePendingPayments } from "@/lib/payment-request-utils";
import { resolvePaymentFromEmailDisplay } from "@/lib/resend/application-payment-request-email";
import type { SendPaymentRequestApplicationOption } from "@/components/application-support/send-payment-request-dialog";
import {
  createSupabaseSecretClient,
  createSupabaseServerClient,
} from "@/utils/supabase-server";

import type { AdminPaidApplicantsPageFilters } from "./parse-admin-paid-applicants-search-params";

export type AdminPaidApplicantTableRow = {
  applicationId: number;
  studentName: string;
  schoolId: string | null;
  schoolName: string;
  packageLabel: string;
  paidAmount: number;
  paidAt: string | null;
};

export type AdminPaidApplicantsPanelProps = {
  rows: AdminPaidApplicantTableRow[];
  totalRows: number;
  page: number;
  limit: number;
  q: string;
  schoolId: string;
  planId: string;
  paymentRequestApplications: SendPaymentRequestApplicationOption[];
  availablePlans: ApplicationPlanCatalogRow[];
  adminName: string;
  adminEmail: string;
  fromEmailDisplay: string;
};

type PersonEmbed =
  | { first_name: string; last_name: string; email?: string | null }
  | { first_name: string; last_name: string; email?: string | null }[]
  | null;

type AppEmbed = {
  id: number;
  student_id: string;
  student_name: string | null;
  student_email: string | null;
  school_id: string | null;
  school_name: string | null;
  plan_id: number;
  package_data: unknown;
  applications_plans:
    | { name: string; price: number; universities_count: number }
    | { name: string; price: number; universities_count: number }[]
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
  schools: { id: string; name: string } | { id: string; name: string }[] | null;
  student_profiles: PersonEmbed;
};

type PaymentRowRaw = {
  id: number;
  amount: number;
  paid_at: string | null;
  updated_at: string | null;
  applications: AppEmbed | AppEmbed[];
};

function firstEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

function personNameFromEmbed(embed: PersonEmbed): string | null {
  const person = firstEmbed(embed);
  if (!person) return null;
  const name = [person.first_name, person.last_name].filter(Boolean).join(" ").trim();
  return name || null;
}

function splitStudentName(full: string | null | undefined): {
  first: string;
  last: string;
} {
  const t = full?.trim() ?? "";
  if (!t) return { first: "", last: "" };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { first: parts[0] ?? "", last: "" };
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

function resolveStudentName(app: AppEmbed): string {
  const profile = firstEmbed(app.student_profiles);
  const fromProfile = personNameFromEmbed(profile);
  if (fromProfile) return fromProfile;

  const fromApplication = app.student_name?.trim();
  if (fromApplication) return fromApplication;

  const split = splitStudentName(app.student_name);
  const combined = [split.first, split.last].filter(Boolean).join(" ").trim();
  return combined || "—";
}

function resolveSchoolName(app: AppEmbed): string {
  const school = firstEmbed(app.schools);
  const fromSchool = school?.name?.trim();
  if (fromSchool) return fromSchool;
  return app.school_name?.trim() || "—";
}

function resolveSchoolId(app: AppEmbed): string | null {
  const fromApp = app.school_id?.trim();
  if (fromApp) return fromApp;
  const school = firstEmbed(app.schools);
  return school?.id?.trim() || null;
}

function resolvePackageLabel(app: AppEmbed): string {
  const plan = firstEmbed(app.applications_plans);
  if (!plan) return "—";

  const packageData = parseApplicationPackageData(app.package_data);
  const universitiesTotal = resolveApplicationUniversitiesTotal(
    packageData,
    plan.universities_count,
  );

  return universitiesTotal > 0 ? String(universitiesTotal) : "—";
}

function resolvePaidAt(payment: PaymentRowRaw): string | null {
  return payment.paid_at ?? payment.updated_at;
}

function mapPaymentRow(
  payment: PaymentRowRaw,
  appById: Map<number, AppEmbed>,
): {
  row: AdminPaidApplicantTableRow;
  paymentRequestOption: SendPaymentRequestApplicationOption;
} | null {
  const app = firstEmbed(payment.applications);
  if (!app) return null;

  const hydratedApp = appById.get(app.id) ?? app;

  return {
    row: {
      applicationId: hydratedApp.id,
      studentName: resolveStudentName(hydratedApp),
      schoolId: resolveSchoolId(hydratedApp),
      schoolName: resolveSchoolName(hydratedApp),
      packageLabel: resolvePackageLabel(hydratedApp),
      paidAmount: payment.amount ?? 0,
      paidAt: resolvePaidAt(payment),
    },
    paymentRequestOption: mapApplicationToPaymentRequestOption(hydratedApp),
  };
}

function dedupeByApplication(
  payments: PaymentRowRaw[],
  appById: Map<number, AppEmbed>,
): {
  rows: AdminPaidApplicantTableRow[];
  paymentRequestApplications: SendPaymentRequestApplicationOption[];
} {
  const seen = new Set<number>();
  const rows: AdminPaidApplicantTableRow[] = [];
  const paymentRequestApplications: SendPaymentRequestApplicationOption[] = [];

  for (const payment of payments) {
    const mapped = mapPaymentRow(payment, appById);
    if (!mapped || seen.has(mapped.row.applicationId)) continue;
    seen.add(mapped.row.applicationId);
    rows.push(mapped.row);
    paymentRequestApplications.push(mapped.paymentRequestOption);
  }

  return { rows, paymentRequestApplications };
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

export async function fetchAdminPaidApplicantsPage(
  filters: AdminPaidApplicantsPageFilters,
): Promise<
  Pick<AdminPaidApplicantsPanelProps, "rows" | "totalRows" | "paymentRequestApplications">
> {
  const supabase = await createSupabaseSecretClient();
  const { q, schoolId, planId, page, limit } = filters;
  const offset = (Math.max(1, page) - 1) * limit;

  await expireOverduePendingPayments(supabase);

  let query = supabase
    .from("payments")
    .select(
      `
      id,
      amount,
      paid_at,
      updated_at,
      applications!inner (
        id,
        student_id,
        student_name,
        student_email,
        school_id,
        school_name,
        plan_id,
        package_data,
        applications_plans ( name, price, universities_count ),
        schools ( id, name ),
        student_profiles ( first_name, last_name, email ),
        payments ( status, amount, due_date, payment_request_sent_at, payment_request_token )
      )
    `,
    )
    .eq("status", "paid")
    .order("paid_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  const trimmed = q.trim();
  if (trimmed) {
    const e = escapeIlike(trimmed);
    query = query.or(
      `student_name.ilike.%${e}%,student_email.ilike.%${e}%`,
      { referencedTable: "applications" },
    );
  }

  if (schoolId) {
    query = query.eq("applications.school_id", schoolId);
  }

  if (planId) {
    query = query.eq("applications.plan_id", Number.parseInt(planId, 10));
  }

  const { data, error } = await query;

  if (error) {
    console.error("[fetchAdminPaidApplicantsPage]", error);
    return { rows: [], totalRows: 0, paymentRequestApplications: [] };
  }

  const rawPayments = (data ?? []) as unknown as PaymentRowRaw[];
  const applications = rawPayments
    .map((payment) => firstEmbed(payment.applications))
    .filter((app): app is AppEmbed => app != null);
  const hydratedApplications = await hydrateApplicationsPlansEmbeds(supabase, applications);
  const appById = new Map(hydratedApplications.map((app) => [app.id, app]));

  const { rows: deduped, paymentRequestApplications } = dedupeByApplication(
    rawPayments,
    appById,
  );
  const totalRows = deduped.length;
  const rows = deduped.slice(offset, offset + limit);

  return { rows, totalRows, paymentRequestApplications };
}

export async function fetchAdminPaidApplicantsPanel(
  filters: AdminPaidApplicantsPageFilters,
): Promise<AdminPaidApplicantsPanelProps> {
  const [pageData, availablePlans, adminSender] = await Promise.all([
    fetchAdminPaidApplicantsPage(filters),
    fetchActiveApplicationPlans(await createSupabaseSecretClient()),
    resolveAdminSender(),
  ]);

  return {
    ...pageData,
    page: filters.page,
    limit: filters.limit,
    q: filters.q,
    schoolId: filters.schoolId,
    planId: filters.planId,
    availablePlans,
    adminName: adminSender.name,
    adminEmail: adminSender.email,
    fromEmailDisplay: resolvePaymentFromEmailDisplay(),
  };
}
