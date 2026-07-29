import "server-only";

import {
  APPLICATION_ACTIVITY_ENTITY_TYPE,
  applicationActivityEntityId,
} from "@/lib/application-activity-log";
import { activateApplicationPackageOffline } from "@/lib/activate-application-package-offline";
import { buildEmptyStubApplicationInsert } from "@/lib/application-support-intake";
import { ensureStudentApplicationDocuments } from "@/lib/ensure-student-application-documents";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

const ADMIN_INDEPENDENT_PAYMENT_SOURCE =
  "Source: Admin independent student creation with offline payment";

export type CreateActiveApplicationPackageForStudentInput = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  advisorId: string;
  amountAed: number;
  planId: number;
  universitiesCount: number;
  actorAdminId?: string | null;
  actorAdminName?: string | null;
};

export type CreateActiveApplicationPackageForStudentResult =
  | { ok: true; applicationId: number; paymentId: number }
  | { ok: false; error: string };

function formatAdvisorName(firstName: string, lastName: string, email: string): string {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || email.trim() || "Advisor";
}

/**
 * Create an application support lead for a student, record an offline paid
 * payment, and promote it to active_package.
 */
export async function createActiveApplicationPackageForStudent(
  input: CreateActiveApplicationPackageForStudentInput,
): Promise<CreateActiveApplicationPackageForStudentResult> {
  const secret = await createSupabaseSecretClient();

  const { data: advisor, error: advisorErr } = await secret
    .from("advisors")
    .select("id, first_name, last_name, email, is_active")
    .eq("id", input.advisorId)
    .maybeSingle();

  if (advisorErr || !advisor) {
    console.error("[createActiveApplicationPackageForStudent] advisor", advisorErr);
    return { ok: false, error: "Selected advisor not found." };
  }

  if (advisor.is_active === false) {
    return { ok: false, error: "Selected advisor is inactive." };
  }

  const { data: plan, error: planErr } = await secret
    .from("applications_plans")
    .select("id, universities_count, is_active")
    .eq("id", input.planId)
    .maybeSingle();

  if (planErr || !plan) {
    console.error("[createActiveApplicationPackageForStudent] plan", planErr);
    return { ok: false, error: "Selected package plan not found." };
  }

  if (plan.is_active === false) {
    return { ok: false, error: "Selected package plan is inactive." };
  }

  const advisorName = formatAdvisorName(
    advisor.first_name?.trim() ?? "",
    advisor.last_name?.trim() ?? "",
    advisor.email?.trim() ?? "",
  );

  const insertRow = buildEmptyStubApplicationInsert({
    studentId: input.studentId,
    schoolId: null,
    advisorId: input.advisorId,
    planId: plan.id,
    planUniversitiesCount: input.universitiesCount,
    studentName: input.studentName,
    studentEmail: input.studentEmail,
    studentPhone: "",
    schoolName: null,
  });

  insertRow.additional_notes = ADMIN_INDEPENDENT_PAYMENT_SOURCE;

  const { data: appRow, error: insertErr } = await secret
    .from("applications")
    .insert(insertRow)
    .select("id")
    .single();

  if (insertErr || !appRow) {
    console.error("[createActiveApplicationPackageForStudent] insert", insertErr);
    return { ok: false, error: "Could not create the application support package." };
  }

  const applicationId = appRow.id;

  const activateResult = await activateApplicationPackageOffline({
    input: {
      applicationId,
      amountAed: input.amountAed,
      universitiesCount: input.universitiesCount,
    },
    advisorId: input.advisorId,
    advisorName,
  });

  if (!activateResult.ok) {
    return activateResult;
  }

  await ensureStudentApplicationDocuments(secret, input.studentId).catch((err) => {
    console.error("[createActiveApplicationPackageForStudent] documents", err);
  });

  const actorLabel = input.actorAdminName?.trim() || "Admin";
  const { error: logErr } = await secret.from("acitivity_logs").insert({
    entitiy_type: APPLICATION_ACTIVITY_ENTITY_TYPE,
    entity_id: applicationActivityEntityId(applicationId),
    action: "application_package_created_admin_independent_student",
    message: `${actorLabel} created active application support package #${applicationId} for independent student with offline payment of ${input.amountAed} AED (${input.universitiesCount} universities), assigned to ${advisorName}.`,
    created_by_type: "admin",
    admin_id: input.actorAdminId ?? null,
    school_admin_id: null,
    student_id: input.studentId,
  });

  if (logErr) {
    console.error("[createActiveApplicationPackageForStudent] activity log", logErr);
  }

  return { ok: true, applicationId, paymentId: activateResult.paymentId };
}
