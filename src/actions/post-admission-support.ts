"use server";

import {
  assignPostAdmissionToReceivingAdvisor,
  fetchPostAdmissionReceivingAdvisor,
} from "@/lib/advisor-receiving-flags";
import {
  POST_ADMISSION_ACTIVITY_ENTITY_TYPE,
  postAdmissionActivityEntityId,
} from "@/lib/post-admission-activity-log";
import {
  formatPostAdmissionServiceLabel,
  isPostAdmissionServiceKey,
  type PostAdmissionServiceKey,
} from "@/lib/post-admission-services";
import { ACTIVE_POST_ADMISSION_STATUSES } from "@/lib/post-admission-status-labels";
import { loadStudentFormDefaults } from "@/lib/load-student-form-defaults";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";

export type CreatePostAdmissionCaseInput = {
  selectedService: PostAdmissionServiceKey;
  serviceOtherDetail?: string;
};

async function requireStudentActor(): Promise<
  { studentId: string; schoolId: string | null } | { error: string }
> {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await authClient.auth.getUser();
  if (authErr || !user) {
    return { error: "You must be signed in." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: profile, error } = await secret
    .from("student_profiles")
    .select("id, school_id")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    console.error(error);
    return { error: "Could not verify your student profile." };
  }
  if (!profile) {
    return { error: "Student profile not found." };
  }
  return { studentId: user.id, schoolId: profile.school_id };
}

function validateServiceInput(input: CreatePostAdmissionCaseInput):
  | { ok: true; selectedService: PostAdmissionServiceKey; serviceOtherDetail: string | null }
  | { ok: false; error: string } {
  const selectedService = input.selectedService?.trim();
  if (!selectedService || !isPostAdmissionServiceKey(selectedService)) {
    return { ok: false, error: "Please select a service." };
  }

  const serviceOtherDetail = input.serviceOtherDetail?.trim() || null;
  if (selectedService === "other" && !serviceOtherDetail) {
    return { ok: false, error: "Please describe the service you need." };
  }

  return {
    ok: true,
    selectedService,
    serviceOtherDetail: selectedService === "other" ? serviceOtherDetail : null,
  };
}

async function persistCaseServiceSelection(
  secret: Awaited<ReturnType<typeof createSupabaseSecretClient>>,
  caseId: number,
  selectedService: PostAdmissionServiceKey,
  serviceOtherDetail: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = new Date().toISOString();
  const { error } = await secret
    .from("post_admission_cases")
    .update({
      selected_service: selectedService,
      service_other_detail: serviceOtherDetail,
      updated_at: now,
    })
    .eq("id", caseId);

  if (error) {
    console.error("[createPostAdmissionCase] update service", error);
    return { ok: false, error: "Could not save your service selection." };
  }

  return { ok: true };
}

export async function createPostAdmissionCase(
  input: CreatePostAdmissionCaseInput,
): Promise<
  | { ok: true; kind: "book"; caseId: number }
  | { ok: true; kind: "already_scheduled"; caseId: number; scheduledAt: string }
  | { ok: false; error: string }
> {
  const validated = validateServiceInput(input);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const { selectedService, serviceOtherDetail } = validated;
  const serviceLabel = formatPostAdmissionServiceLabel(
    selectedService,
    serviceOtherDetail,
  );

  const actor = await requireStudentActor();
  if ("error" in actor) {
    return { ok: false, error: actor.error };
  }

  const receivingAdvisor = await fetchPostAdmissionReceivingAdvisor();
  if (!receivingAdvisor) {
    return {
      ok: false,
      error: "No advisor is available for post-admission support right now. Please try again later.",
    };
  }

  if (!receivingAdvisor.calendlySchedulingUrl) {
    return {
      ok: false,
      error: "Advisor scheduling is not configured yet. Please try again later.",
    };
  }

  const secret = await createSupabaseSecretClient();

  const { data: existing } = await secret
    .from("post_admission_cases")
    .select("id, scheduled_at")
    .eq("student_id", actor.studentId)
    .in("status", ACTIVE_POST_ADMISSION_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const scheduledAt = existing.scheduled_at?.trim() || null;
    if (scheduledAt) {
      const meetingAt = new Date(scheduledAt);
      if (!Number.isNaN(meetingAt.getTime()) && meetingAt.getTime() > Date.now()) {
        return {
          ok: true,
          kind: "already_scheduled",
          caseId: existing.id,
          scheduledAt,
        };
      }
    }

    const updateResult = await persistCaseServiceSelection(
      secret,
      existing.id,
      selectedService,
      serviceOtherDetail,
    );
    if (!updateResult.ok) {
      return updateResult;
    }

    return { ok: true, kind: "book", caseId: existing.id };
  }

  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  const profileDefaults = await loadStudentFormDefaults(actor.studentId, user?.email);

  const studentName = profileDefaults?.fullName?.trim() || null;
  const studentEmail = profileDefaults?.email?.trim() || user?.email?.trim() || null;
  const schoolName = profileDefaults?.schoolName?.trim() || null;

  let schoolId: string | null = actor.schoolId;
  if (!schoolId && profileDefaults?.schoolName) {
    const { data: school } = await secret
      .from("schools")
      .select("id")
      .ilike("name", profileDefaults.schoolName.trim())
      .limit(1)
      .maybeSingle();
    schoolId = school?.id ?? null;
  }

  const now = new Date().toISOString();
  const { data: inserted, error: insertErr } = await secret
    .from("post_admission_cases")
    .insert({
      student_id: actor.studentId,
      school_id: schoolId,
      status: "intake_draft",
      student_name: studentName,
      student_email: studentEmail,
      school_name: schoolName,
      selected_service: selectedService,
      service_other_detail: serviceOtherDetail,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    console.error("[createPostAdmissionCase] insert", insertErr);
    return { ok: false, error: "Could not start post-admission support." };
  }

  await assignPostAdmissionToReceivingAdvisor(secret, {
    caseId: inserted.id,
    studentId: actor.studentId,
  });

  const { error: logErr } = await secret.from("acitivity_logs").insert({
    entitiy_type: POST_ADMISSION_ACTIVITY_ENTITY_TYPE,
    entity_id: postAdmissionActivityEntityId(inserted.id),
    action: "post_admission_intake_draft_created",
    message: `Student started post-admission intake for ${serviceLabel} (case #${inserted.id}, awaiting lead qualification).`,
    created_by_type: "student",
    admin_id: null,
    school_admin_id: null,
    student_id: actor.studentId,
  });

  if (logErr) {
    console.error("[createPostAdmissionCase] activity log", logErr);
  }

  return { ok: true, kind: "book", caseId: inserted.id };
}
