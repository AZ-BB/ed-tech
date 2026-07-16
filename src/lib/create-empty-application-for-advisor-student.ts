import "server-only";

import {
  APPLICATION_ACTIVITY_ENTITY_TYPE,
  applicationActivityEntityId,
} from "@/lib/application-activity-log";
import {
  ACTIVE_APPLICATION_STATUSES,
  buildEmptyStubApplicationInsert,
  fetchSmallestActivePlan,
} from "@/lib/application-support-intake";
import { ensureStudentApplicationDocuments } from "@/lib/ensure-student-application-documents";
import type { createSupabaseSecretClient } from "@/utils/supabase-server";

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export async function studentHasActiveApplication(
  secret: SecretClient,
  studentId: string,
): Promise<boolean> {
  const { count, error } = await secret
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .in("status", [...ACTIVE_APPLICATION_STATUSES]);

  if (error) {
    console.error("[studentHasActiveApplication]", error);
    return true;
  }

  return (count ?? 0) > 0;
}

/**
 * @deprecated Lead creation from advisor-session booking was removed.
 * Leads are created only when an advisor marks a session as Good lead
 * (see `createApplicationLeadFromAdvisorSession`).
 */
export async function createEmptyApplicationForAdvisorStudentIfNeeded(
  secret: SecretClient,
  input: {
    studentId: string;
    advisorId: string;
    studentName: string;
    studentEmail: string;
    studentPhone: string;
    schoolId: string | null;
    schoolName: string | null;
  },
): Promise<{ created: boolean; applicationId?: number }> {
  const hasActive = await studentHasActiveApplication(secret, input.studentId);
  if (hasActive) {
    return { created: false };
  }

  const plan = await fetchSmallestActivePlan(secret);
  if (!plan) {
    console.error("[createEmptyApplicationForAdvisorStudentIfNeeded] no active plan");
    return { created: false };
  }

  const insertRow = buildEmptyStubApplicationInsert({
    studentId: input.studentId,
    schoolId: input.schoolId,
    advisorId: input.advisorId,
    planId: plan.id,
    planUniversitiesCount: plan.universities_count,
    studentName: input.studentName,
    studentEmail: input.studentEmail,
    studentPhone: input.studentPhone,
    schoolName: input.schoolName,
  });

  const { data: appRow, error: insErr } = await secret
    .from("applications")
    .insert(insertRow)
    .select("id")
    .single();

  if (insErr || !appRow) {
    console.error("[createEmptyApplicationForAdvisorStudentIfNeeded] insert", insErr);
    return { created: false };
  }

  const applicationId = appRow.id;

  const { error: logErr } = await secret.from("acitivity_logs").insert({
    entitiy_type: APPLICATION_ACTIVITY_ENTITY_TYPE,
    entity_id: applicationActivityEntityId(applicationId),
    action: "application_created_from_advisor_session_booking",
    message: `Empty application support lead #${applicationId} created when student booked advisor session.`,
    created_by_type: "student",
    admin_id: null,
    school_admin_id: null,
    student_id: input.studentId,
  });
  if (logErr) {
    console.error("[createEmptyApplicationForAdvisorStudentIfNeeded] activity log", logErr);
  }

  await ensureStudentApplicationDocuments(secret, input.studentId).catch((err) => {
    console.error("[createEmptyApplicationForAdvisorStudentIfNeeded] documents", err);
  });

  return { created: true, applicationId };
}
