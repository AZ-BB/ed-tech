import {
  APPLICATION_DETAIL_SELECT,
  mapApplicationDetailPayload,
  type ApplicationDetailPayload,
} from "@/lib/application-detail-mapper";
import { mapApplicationChecklistDocuments } from "@/lib/application-checklist-mapper";
import { fetchApplicationChecklistDocuments } from "@/lib/ensure-application-checklist-documents";
import { fetchApplicationCalls } from "@/lib/fetch-application-calls";
import { fetchApplicationInternalNotes } from "@/lib/application-internal-notes";
import { fetchApplicationTasks } from "@/lib/fetch-application-tasks";
import { fetchApplicationUniversityTargets } from "@/lib/fetch-application-university-targets";
import { resolveCurrentAdvisorId } from "@/lib/advisor-access";
import {
  fetchApplicationPayoutSummary,
  fetchPayoutsByPaymentIds,
} from "@/lib/advisor-payouts/fetch-application-payouts";
import { createSupabaseServerClient } from "@/utils/supabase-server";

export type AdvisorApplicationDetailPayload = ApplicationDetailPayload;

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

  const [{ data: payments }, internalNotes, checklistRows, calls, tasks, universityTargets] =
    await Promise.all([
      supabase
        .from("payments")
        .select("id, amount, status, created_at, paid_at, updated_at")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false }),
      fetchApplicationInternalNotes(supabase, applicationId),
      fetchApplicationChecklistDocuments(supabase, applicationId),
      fetchApplicationCalls(supabase, applicationId),
      fetchApplicationTasks(supabase, applicationId),
      fetchApplicationUniversityTargets(supabase, applicationId),
    ]);

  const paymentIds = (payments ?? []).map((payment) => payment.id);
  const [payoutByPaymentId, payoutSummary] = await Promise.all([
    fetchPayoutsByPaymentIds(supabase, paymentIds),
    fetchApplicationPayoutSummary(supabase, applicationId, advisorId),
  ]);

  return mapApplicationDetailPayload(
    data,
    payments ?? [],
    ADVISOR_LINKS,
    internalNotes,
    mapApplicationChecklistDocuments(checklistRows),
    calls,
    tasks,
    { payoutByPaymentId, payoutSummary },
    universityTargets,
  );
}
