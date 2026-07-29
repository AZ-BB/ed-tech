import { escapeIlike } from "@/app/(protected)/school/_lib/student-search";
import {
  expireOverduePendingPayments,
  resolvePaymentDisplayStatus,
  todayDateString,
} from "@/lib/payment-request-utils";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

import type { AdminPaymentsPageFilters } from "./parse-admin-payments-search-params";

export type AdminPaymentTableRow = {
  id: number;
  studentId: string;
  studentName: string;
  studentEmail: string;
  kind: "application" | "post_admission";
  referenceId: number;
  referenceLabel: string;
  referenceHref: string;
  amount: number;
  status: string;
  dueDate: string | null;
  requestedByLabel: string;
  createdAt: string | null;
  sentAt: string | null;
  paidAt: string | null;
};

type PersonEmbed =
  | { first_name: string; last_name: string; email?: string | null }
  | { first_name: string; last_name: string; email?: string | null }[]
  | null;

type PaymentRowRaw = {
  id: number;
  amount: number;
  status: string | null;
  due_date: string | null;
  created_at: string | null;
  paid_at: string | null;
  updated_at: string | null;
  payment_request_sent_at: string | null;
  application_id: number | null;
  post_admission_case_id: number | null;
  student_id: string;
  requested_by_type: string | null;
  student_profiles: PersonEmbed;
  applications:
    | { id: number; student_name: string | null; student_email: string | null }
    | { id: number; student_name: string | null; student_email: string | null }[]
    | null;
  post_admission_cases:
    | { id: number; student_name: string | null; student_email: string | null }
    | { id: number; student_name: string | null; student_email: string | null }[]
    | null;
  advisors: PersonEmbed;
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

function resolveStudentName(row: PaymentRowRaw): string {
  const profile = firstEmbed(row.student_profiles);
  const profileName = profile
    ? personName(profile.first_name, profile.last_name)
    : "";

  if (profileName) return profileName;

  const application = firstEmbed(row.applications);
  const appName = application?.student_name?.trim();
  if (appName) return appName;

  const postAdmissionCase = firstEmbed(row.post_admission_cases);
  const caseName = postAdmissionCase?.student_name?.trim();
  if (caseName) return caseName;

  return "—";
}

function resolveStudentEmail(row: PaymentRowRaw): string {
  const profile = firstEmbed(row.student_profiles);
  const profileEmail = profile?.email?.trim();
  if (profileEmail) return profileEmail;

  const application = firstEmbed(row.applications);
  const appEmail = application?.student_email?.trim();
  if (appEmail) return appEmail;

  const postAdmissionCase = firstEmbed(row.post_admission_cases);
  const caseEmail = postAdmissionCase?.student_email?.trim();
  if (caseEmail) return caseEmail;

  return "—";
}

function resolveRequestedByLabel(row: PaymentRowRaw): string {
  const advisor = firstEmbed(row.advisors);
  const advisorName = advisor
    ? personName(advisor.first_name, advisor.last_name)
    : "";
  if (advisorName) return advisorName;

  const type = row.requested_by_type?.trim();
  if (type === "admin") return "Admin";
  if (type === "advisor") return "Advisor";

  return "—";
}

function mapPaymentRow(row: PaymentRowRaw): AdminPaymentTableRow | null {
  const isPostAdmission = row.post_admission_case_id != null;
  const isApplication = row.application_id != null;

  if (!isPostAdmission && !isApplication) return null;

  const kind = isPostAdmission ? "post_admission" : "application";
  const referenceId = isPostAdmission
    ? row.post_admission_case_id!
    : row.application_id!;
  const referenceLabel = isPostAdmission
    ? `Post-admission #${referenceId}`
    : `Application #${referenceId}`;
  const referenceHref = isPostAdmission
    ? `/admin/post-admission/${referenceId}`
    : `/admin/applications/${referenceId}`;

  return {
    id: row.id,
    studentId: row.student_id,
    studentName: resolveStudentName(row),
    studentEmail: resolveStudentEmail(row),
    kind,
    referenceId,
    referenceLabel,
    referenceHref,
    amount: row.amount ?? 0,
    status: resolvePaymentDisplayStatus({
      status: row.status,
      due_date: row.due_date,
    }),
    dueDate: row.due_date,
    requestedByLabel: resolveRequestedByLabel(row),
    createdAt: row.created_at,
    sentAt: row.payment_request_sent_at,
    paidAt:
      row.status === "paid" ? row.paid_at ?? row.updated_at : row.paid_at,
  };
}

function applyStatusFilter<T extends { eq: Function; or: Function }>(
  query: T,
  status: AdminPaymentsPageFilters["status"],
): T {
  const today = todayDateString();

  if (status === "paid") {
    return query.eq("status", "paid");
  }

  if (status === "failed") {
    return query.or(`status.eq.failed,and(status.eq.pending,due_date.lt.${today})`);
  }

  if (status === "pending") {
    return query
      .eq("status", "pending")
      .or(`due_date.is.null,due_date.gte.${today}`);
  }

  return query;
}

export async function fetchAdminPaymentsPage(filters: AdminPaymentsPageFilters): Promise<{
  rows: AdminPaymentTableRow[];
  totalRows: number;
}> {
  const { q, status, type, page, limit } = filters;
  const supabase = await createSupabaseSecretClient();
  const offset = (Math.max(1, page) - 1) * limit;

  await expireOverduePendingPayments(supabase);

  let query = supabase
    .from("payments")
    .select(
      `
      id,
      amount,
      status,
      due_date,
      created_at,
      paid_at,
      updated_at,
      payment_request_sent_at,
      application_id,
      post_admission_case_id,
      student_id,
      requested_by_type,
      student_profiles:student_id ( first_name, last_name, email ),
      applications ( id, student_name, student_email ),
      post_admission_cases ( id, student_name, student_email ),
      advisors:requested_by_advisor_id ( first_name, last_name )
    `,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  query = applyStatusFilter(query, status);

  if (type === "application") {
    query = query.not("application_id", "is", null);
  } else if (type === "post_admission") {
    query = query.not("post_admission_case_id", "is", null);
  }

  const trimmed = q.trim();
  if (trimmed) {
    const e = escapeIlike(trimmed);
    const numericId = Number.parseInt(trimmed, 10);
    if (Number.isFinite(numericId) && String(numericId) === trimmed) {
      query = query.eq("id", numericId);
    } else {
      query = query.or(
        `first_name.ilike.%${e}%,last_name.ilike.%${e}%,email.ilike.%${e}%`,
        { referencedTable: "student_profiles" },
      );
    }
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error("[fetchAdminPaymentsPage]", error);
    return { rows: [], totalRows: 0 };
  }

  const rows = (data ?? [])
    .map((row) => mapPaymentRow(row as unknown as PaymentRowRaw))
    .filter((row): row is AdminPaymentTableRow => row != null);

  return {
    rows,
    totalRows: count ?? rows.length,
  };
}
