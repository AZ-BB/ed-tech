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
import { resolveCurrentAdvisorId } from "@/lib/advisor-access";
import {
  fetchApplicationPayoutSummary,
  fetchApplicationPayouts,
  fetchPayoutsByPaymentIds,
} from "@/lib/advisor-payouts/fetch-application-payouts";
import {
  hydrateApplicationsPlansEmbeds,
} from "@/lib/applications-plans";
import { buildPaymentRequestModalContext } from "@/lib/fetch-payment-request-modal-context";
import { expireOverduePendingPayments } from "@/lib/payment-request-utils";
import { mapApplicationRowToEditableIntake } from "@/lib/fetch-advisor-session-editable-application";
import type { ApplicationSupportPayload } from "@/lib/application-support-intake";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";

export type AdvisorApplicationIntakeEdit = {
  initialPayload: ApplicationSupportPayload;
};

export type AdvisorApplicationDetailPayload = ApplicationDetailPayload & {
  applicationPayouts: Awaited<ReturnType<typeof fetchApplicationPayouts>>;
  paymentRequestContext: Awaited<ReturnType<typeof buildPaymentRequestModalContext>> | null;
  intakeEdit: AdvisorApplicationIntakeEdit;
};

const ADVISOR_LINKS = {
  studentHref: () => null,
  schoolHref: () => null,
};

export async function fetchAdvisorApplicationDetail(
  applicationIdRaw: string,
): Promise<AdvisorApplicationDetailPayload | null> {
  const applicationId = Number.parseInt(applicationIdRaw.trim(), 10);
  if (!Number.isFinite(applicationId) || applicationId < 1) return null;

  const supabase = await createSupabaseServerClient();
  const advisorId = await resolveCurrentAdvisorId(supabase);
  if (!advisorId) return null;

  const { data, error } = await supabase
    .from("applications")
    .select(APPLICATION_DETAIL_SELECT)
    .eq("id", applicationId)
    .eq("assigned_to", advisorId)
    .maybeSingle();

  if (error) {
    console.error("[fetchAdvisorApplicationDetail]", error);
    return null;
  }

  if (!data) return null;

  await expireOverduePendingPayments(await createSupabaseSecretClient(), {
    applicationId,
  });

  const [applicationRow] = await hydrateApplicationsPlansEmbeds(supabase, [data]);
  const hydratedData = applicationRow ?? data;

  const { data: advisorRow } = await supabase
    .from("advisors")
    .select("first_name, last_name, email")
    .eq("id", advisorId)
    .maybeSingle();

  const advisorName =
    [advisorRow?.first_name, advisorRow?.last_name].filter(Boolean).join(" ").trim() ||
    "Advisor";
  const advisorEmail = advisorRow?.email?.trim() || "";

  const secret = await createSupabaseSecretClient();

  const [
    { data: payments },
    internalNotes,
    studentDocuments,
    calls,
    tasks,
    allApplicationPayouts,
    universityTargets,
  ] = await Promise.all([
    supabase
      .from("payments")
      .select("id, amount, status, due_date, created_at, payment_request_sent_at, paid_at, updated_at")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false }),
    fetchApplicationInternalNotes(supabase, applicationId),
    ensureStudentApplicationDocuments(secret, data.student_id),
    fetchApplicationCalls(supabase, applicationId),
    fetchApplicationTasks(supabase, applicationId),
    fetchApplicationPayouts(supabase, applicationId),
    fetchApplicationUniversityTargets(supabase, applicationId),
  ]);

  const applicationPayouts = allApplicationPayouts.filter(
    (payout) => payout.advisorId === advisorId,
  );

  const paymentIds = (payments ?? []).map((payment) => payment.id);
  const [payoutByPaymentId, payoutSummary] = await Promise.all([
    fetchPayoutsByPaymentIds(supabase, paymentIds),
    fetchApplicationPayoutSummary(supabase, applicationId, advisorId),
  ]);

  const payload = mapApplicationDetailPayload(
    hydratedData,
    payments ?? [],
    ADVISOR_LINKS,
    internalNotes,
    studentDocuments,
    calls,
    tasks,
    { payoutByPaymentId, payoutSummary },
    universityTargets,
  );

  const paymentRequestContext = await buildPaymentRequestModalContext(
    supabase,
    hydratedData,
    payments ?? [],
    { name: advisorName, email: advisorEmail },
  );

  const intakeMapped = mapApplicationRowToEditableIntake(hydratedData);

  return {
    ...payload,
    applicationPayouts,
    paymentRequestContext,
    intakeEdit: {
      initialPayload: intakeMapped.initialPayload,
    },
  };
}
