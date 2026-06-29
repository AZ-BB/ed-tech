import { resolveCurrentAdvisorId } from "@/lib/advisor-access";
import {
  parseApplicationPackageData,
  resolveApplicationUniversitiesTotal,
} from "@/lib/application-package-data";
import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import { hydrateApplicationsPlansEmbeds } from "@/lib/applications-plans";
import { createSupabaseServerClient } from "@/utils/supabase-server";

type DbClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type PaymentEmbed = {
  amount: number;
  status: string | null;
  paid_at: string | null;
};

type ActivePackageRowRaw = {
  id: number;
  plan_id: number;
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
  payments: PaymentEmbed | PaymentEmbed[];
};

export type AdvisorActivePackageRow = {
  id: number;
  studentName: string;
  studentInitials: string;
  studentEmail: string;
  packagePurchased: string;
  amountPaidAed: number;
  paidOn: string | null;
  statusLabel: "Active" | "Submitted";
};

export type AdvisorActivePackagesPanelProps = {
  rows: AdvisorActivePackageRow[];
  totalRows: number;
  page: number;
  limit: number;
  search: string;
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

function mapActivePackageRow(row: ActivePackageRowRaw): AdvisorActivePackageRow {
  const profile = firstEmbed(row.student_profiles);
  const profileName = profile ? personName(profile.first_name, profile.last_name) : "";
  const studentName =
    profileName || row.student_name?.trim() || "Student";
  const studentEmail =
    profile?.email?.trim() || row.student_email?.trim() || "—";

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

  const paidOn = paidPayments
    .map((payment) => payment.paid_at)
    .filter((value): value is string => Boolean(value))
    .sort()[0] ?? null;

  return {
    id: row.id,
    studentName,
    studentInitials: studentInitials(studentName),
    studentEmail,
    packagePurchased: formatPackagePurchased(plan, row.package_data),
    amountPaidAed,
    paidOn,
    statusLabel: "Active",
  };
}

export function parseAdvisorActivePackagesSearch(
  raw: string | string[] | undefined,
): string {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  return value?.trim() ?? "";
}

async function fetchAdvisorActivePackagesPage(
  advisorId: string,
  options: { page: number; limit: number; search: string; client: DbClient },
): Promise<{ rows: AdvisorActivePackageRow[]; totalRows: number }> {
  const { page, limit, search, client } = options;
  const { from, to } = paginationRange(page, limit);

  let query = client
    .from("applications")
    .select(
      `
      id,
      plan_id,
      student_name,
      student_email,
      status,
      package_data,
      applications_plans!applications_plan_id_fkey ( name, price, universities_count ),
      student_profiles ( first_name, last_name, email ),
      payments ( amount, status, paid_at )
    `,
      { count: "exact" },
    )
    .eq("assigned_to", advisorId)
    .eq("status", "active_package")
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false });

  if (search) {
    const e = escapeIlike(search);
    query = query.or(`student_name.ilike.%${e}%,student_email.ilike.%${e}%`);
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error("[fetchAdvisorActivePackagesPage]", error);
    return { rows: [], totalRows: 0 };
  }

  const hydratedRows = await hydrateApplicationsPlansEmbeds(
    client,
    (data ?? []) as unknown as ActivePackageRowRaw[],
  );
  const rows = hydratedRows.map(mapActivePackageRow);

  return { rows, totalRows: count ?? 0 };
}

export async function fetchAdvisorActivePackagesPanel(
  options: { page: number; limit: number; search: string },
): Promise<AdvisorActivePackagesPanelProps | null> {
  const supabase = await createSupabaseServerClient();
  const advisorId = await resolveCurrentAdvisorId(supabase);
  if (!advisorId) return null;

  const pageResult = await fetchAdvisorActivePackagesPage(advisorId, {
    ...options,
    client: supabase,
  });

  return {
    ...pageResult,
    page: options.page,
    limit: options.limit,
    search: options.search,
  };
}
