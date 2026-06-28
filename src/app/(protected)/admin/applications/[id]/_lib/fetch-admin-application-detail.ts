import {
  APPLICATION_DETAIL_SELECT,
  mapApplicationDetailPayload,
  type ApplicationDetailPayload,
} from "@/lib/application-detail-mapper";
import { ensureStudentApplicationDocuments } from "@/lib/ensure-student-application-documents";
import { fetchApplicationCalls } from "@/lib/fetch-application-calls";
import { fetchApplicationInternalNotes } from "@/lib/application-internal-notes";
import { fetchApplicationTasks } from "@/lib/fetch-application-tasks";
import { fetchApplicationUniversityTargets } from "@/lib/fetch-application-university-targets";
import { hydrateApplicationsPlansEmbeds } from "@/lib/applications-plans";
import { buildPaymentRequestModalContext } from "@/lib/fetch-payment-request-modal-context";
import { expireOverduePendingPayments } from "@/lib/payment-request-utils";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import {
  fetchApplicationPayoutSummary,
  fetchApplicationPayouts,
  fetchPayoutsByPaymentIds,
} from "@/lib/advisor-payouts/fetch-application-payouts";

export type AdminApplicationDetailPayload = ApplicationDetailPayload & {
  applicationPayouts: Awaited<ReturnType<typeof fetchApplicationPayouts>>;
  paymentRequestContext: Awaited<ReturnType<typeof buildPaymentRequestModalContext>> | null;
};
export type AdminApplicationPaymentRow = ApplicationDetailPayload["payments"][number];

const ADMIN_LINKS = {
  studentHref: (studentId: string) => `/admin/users/students/${studentId}`,
  schoolHref: (schoolId: string) => `/admin/schools/${schoolId}`,
};

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

export async function fetchAdminApplicationDetail(
  applicationIdRaw: string,
): Promise<AdminApplicationDetailPayload | null> {
  const applicationId = Number.parseInt(applicationIdRaw.trim(), 10);
  if (!Number.isFinite(applicationId) || applicationId < 1) return null;

  const supabase = await createSupabaseSecretClient();

  await expireOverduePendingPayments(supabase, { applicationId });

  const { data, error } = await supabase
    .from("applications")
    .select(APPLICATION_DETAIL_SELECT)
    .eq("id", applicationId)
    .maybeSingle();

  if (error) {
    console.error("[fetchAdminApplicationDetail]", error);
    return null;
  }

  if (!data) return null;

  const [hydratedRow] = await hydrateApplicationsPlansEmbeds(supabase, [data]);
  const hydratedData = hydratedRow ?? data;

  const [{ data: payments }, internalNotes, studentDocuments, calls, tasks, applicationPayouts, universityTargets, adminSender] =
    await Promise.all([
      supabase
        .from("payments")
        .select("id, amount, status, due_date, created_at, payment_request_sent_at, paid_at, updated_at")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false }),
      fetchApplicationInternalNotes(supabase, applicationId),
      ensureStudentApplicationDocuments(supabase, data.student_id),
      fetchApplicationCalls(supabase, applicationId),
      fetchApplicationTasks(supabase, applicationId),
      fetchApplicationPayouts(supabase, applicationId),
      fetchApplicationUniversityTargets(supabase, applicationId),
      resolveAdminSender(),
    ]);

  const paymentIds = (payments ?? []).map((payment) => payment.id);
  const [payoutByPaymentId, payoutSummary] = await Promise.all([
    fetchPayoutsByPaymentIds(supabase, paymentIds),
    fetchApplicationPayoutSummary(supabase, applicationId, data.assigned_to),
  ]);

  const payload = mapApplicationDetailPayload(
    hydratedData,
    payments ?? [],
    ADMIN_LINKS,
    internalNotes,
    studentDocuments,
    calls,
    tasks,
    { payoutByPaymentId, payoutSummary },
    universityTargets,
  );

  const authClient = await createSupabaseServerClient();
  const paymentRequestContext = await buildPaymentRequestModalContext(
    authClient,
    hydratedData,
    payments ?? [],
    adminSender,
  );

  return {
    ...payload,
    applicationPayouts,
    paymentRequestContext,
  };
}
