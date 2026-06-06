import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { AdminPaidApplicantsPageFilters } from "./parse-admin-paid-applicants-search-params";

export type AdminPaidApplicantTableRow = {
  applicationId: number;
  studentName: string;
  packageLabel: string;
  packagePrice: number;
  paidAmount: number;
  paidAt: string | null;
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
  applications_plans:
    | { name: string; price: number; universities_count: number }
    | { name: string; price: number; universities_count: number }[]
    | null;
  schools: { name: string } | { name: string }[] | null;
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

function resolvePackageLabel(app: AppEmbed): string {
  const plan = firstEmbed(app.applications_plans);
  if (!plan) return "—";
  const count = plan.universities_count;
  if (Number.isFinite(count) && count > 0) {
    return `${count} ${count === 1 ? "university" : "universities"}`;
  }
  return plan.name?.trim() || "—";
}

function resolvePackagePrice(app: AppEmbed): number {
  const plan = firstEmbed(app.applications_plans);
  return plan?.price ?? 0;
}

function resolvePaidAt(payment: PaymentRowRaw): string | null {
  return payment.paid_at ?? payment.updated_at;
}

function mapPaymentRow(payment: PaymentRowRaw): AdminPaidApplicantTableRow | null {
  const app = firstEmbed(payment.applications);
  if (!app) return null;

  return {
    applicationId: app.id,
    studentName: resolveStudentName(app),
    packageLabel: resolvePackageLabel(app),
    packagePrice: resolvePackagePrice(app),
    paidAmount: payment.amount ?? 0,
    paidAt: resolvePaidAt(payment),
  };
}

function dedupeByApplication(
  payments: PaymentRowRaw[],
): AdminPaidApplicantTableRow[] {
  const seen = new Set<number>();
  const rows: AdminPaidApplicantTableRow[] = [];

  for (const payment of payments) {
    const row = mapPaymentRow(payment);
    if (!row || seen.has(row.applicationId)) continue;
    seen.add(row.applicationId);
    rows.push(row);
  }

  return rows;
}

export async function fetchAdminPaidApplicantsPage(
  filters: AdminPaidApplicantsPageFilters,
): Promise<{ rows: AdminPaidApplicantTableRow[]; totalRows: number }> {
  const supabase = await createSupabaseSecretClient();
  const { q, schoolId, planId, page, limit } = filters;
  const offset = (Math.max(1, page) - 1) * limit;

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
        applications_plans ( name, price, universities_count ),
        schools ( name ),
        student_profiles ( first_name, last_name, email )
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
    return { rows: [], totalRows: 0 };
  }

  const deduped = dedupeByApplication((data ?? []) as unknown as PaymentRowRaw[]);
  const totalRows = deduped.length;
  const rows = deduped.slice(offset, offset + limit);

  return { rows, totalRows };
}
