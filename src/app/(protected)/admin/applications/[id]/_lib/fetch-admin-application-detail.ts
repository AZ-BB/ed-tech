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
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import {
  fetchApplicationPayoutSummary,
  fetchApplicationPayouts,
  fetchPayoutsByPaymentIds,
} from "@/lib/advisor-payouts/fetch-application-payouts";

export type AdminApplicationDetailPayload = ApplicationDetailPayload & {
  applicationPayouts: Awaited<ReturnType<typeof fetchApplicationPayouts>>;
};
export type AdminApplicationPaymentRow = ApplicationDetailPayload["payments"][number];

const ADMIN_LINKS = {
  studentHref: (studentId: string) => `/admin/users/students/${studentId}`,
  schoolHref: (schoolId: string) => `/admin/schools/${schoolId}`,
};

export async function fetchAdminApplicationDetail(
  applicationIdRaw: string,
): Promise<AdminApplicationDetailPayload | null> {
  const applicationId = Number.parseInt(applicationIdRaw.trim(), 10);
  if (!Number.isFinite(applicationId) || applicationId < 1) return null;

  const supabase = await createSupabaseSecretClient();

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

  const [{ data: payments }, internalNotes, checklistRows, calls, tasks, applicationPayouts, universityTargets] =
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
      fetchApplicationPayouts(supabase, applicationId),
      fetchApplicationUniversityTargets(supabase, applicationId),
    ]);

  const paymentIds = (payments ?? []).map((payment) => payment.id);
  const [payoutByPaymentId, payoutSummary] = await Promise.all([
    fetchPayoutsByPaymentIds(supabase, paymentIds),
    fetchApplicationPayoutSummary(supabase, applicationId, data.assigned_to),
  ]);

  const payload = mapApplicationDetailPayload(
    data,
    payments ?? [],
    ADMIN_LINKS,
    internalNotes,
    mapApplicationChecklistDocuments(checklistRows),
    calls,
    tasks,
    { payoutByPaymentId, payoutSummary },
    universityTargets,
  );

  return {
    ...payload,
    applicationPayouts,
  };
}
