"use server";

import {
  APPLICATION_ACTIVITY_ENTITY_TYPE,
  applicationActivityEntityId,
} from "@/lib/application-activity-log";
import {
  assignFreeFunnelApplicationToReceivingAdvisor,
  fetchFreeFunnelApplicationReceivingAdvisor,
} from "@/lib/advisor-receiving-flags";
import { DEFAULT_APPLICATION_PACKAGE_DATA } from "@/lib/application-package-data";
import { fetchSmallestActivePlan } from "@/lib/application-support-intake";
import {
  applicationUtmContent,
  buildCalendlySchedulingPageUrl,
} from "@/lib/calendly-scheduling";
import { loadStudentFormDefaults } from "@/lib/load-student-form-defaults";
import { requireStudentSession } from "@/lib/student-ai-usage-log";
import { requiresFunnelSubscription } from "@/lib/student-subscription";
import {
  isPlatformFeatureEnabledByKey,
  PLATFORM_FEATURE_UNAVAILABLE_MESSAGE,
} from "@/lib/platform-settings";
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";

import type { Database } from "@/database.types";

const FREE_FUNNEL_APPLICATION_SUPPORT_SOURCE =
  "Source: Free funnel dashboard application support";

async function requireFreeFunnelStudent(): Promise<
  { studentId: string; schoolId: string | null } | { error: string }
> {
  const auth = await requireStudentSession();
  if (!auth.ok) {
    return { error: "You must be signed in." };
  }

  if (!requiresFunnelSubscription(auth)) {
    return { error: "This booking flow is only available for free funnel students." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: profile, error } = await secret
    .from("student_profiles")
    .select("id, school_id")
    .eq("id", auth.studentId)
    .maybeSingle();

  if (error) {
    console.error(error);
    return { error: "Could not verify your student profile." };
  }
  if (!profile) {
    return { error: "Student profile not found." };
  }

  return { studentId: auth.studentId, schoolId: profile.school_id };
}

export async function startFreeFunnelApplicationSupport(): Promise<
  | { ok: true; calendlyUrl: string; applicationId: number }
  | { ok: true; kind: "already_scheduled"; scheduledAt: string }
  | { ok: false; error: string }
> {
  const featureEnabled = await isPlatformFeatureEnabledByKey("application_support");
  if (!featureEnabled) {
    return { ok: false, error: PLATFORM_FEATURE_UNAVAILABLE_MESSAGE };
  }

  const actor = await requireFreeFunnelStudent();
  if ("error" in actor) {
    return { ok: false, error: actor.error };
  }

  const receivingAdvisor = await fetchFreeFunnelApplicationReceivingAdvisor();
  if (!receivingAdvisor) {
    return {
      ok: false,
      error: "No advisor is available for application support right now. Please try again later.",
    };
  }

  if (!receivingAdvisor.calendlySchedulingUrl) {
    return {
      ok: false,
      error: "Advisor scheduling is not configured yet. Please try again later.",
    };
  }

  const secret = await createSupabaseSecretClient();

  const { data: existingDraft } = await secret
    .from("applications")
    .select("id, scheduled_at")
    .eq("student_id", actor.studentId)
    .eq("status", "intake_draft")
    .eq("additional_notes", FREE_FUNNEL_APPLICATION_SUPPORT_SOURCE)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingDraft?.scheduled_at) {
    const scheduledAt = existingDraft.scheduled_at.trim();
    const meetingAt = new Date(scheduledAt);
    if (!Number.isNaN(meetingAt.getTime()) && meetingAt.getTime() > Date.now()) {
      return {
        ok: true,
        kind: "already_scheduled",
        scheduledAt,
      };
    }
  }

  let applicationId = existingDraft?.id ?? null;

  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  const profileDefaults = await loadStudentFormDefaults(actor.studentId, user?.email);
  const fullName = profileDefaults.fullName?.trim() ?? "";
  const email = profileDefaults.email?.trim() || user?.email?.trim() || "";

  if (!applicationId) {
    const plan = await fetchSmallestActivePlan(secret);
    if (!plan) {
      return {
        ok: false,
        error: "Application plans are not configured. Please contact support.",
      };
    }

    const studentName = profileDefaults.fullName?.trim() || null;
    const studentEmail = profileDefaults.email?.trim() || user?.email?.trim() || null;
    const studentPhone = profileDefaults.phone?.trim() || null;
    const schoolName = profileDefaults.schoolName?.trim() || null;

    const insertRow: Database["public"]["Tables"]["applications"]["Insert"] = {
      student_id: actor.studentId,
      school_id: actor.schoolId,
      student_name: studentName,
      student_email: studentEmail,
      student_phone: studentPhone,
      school_name: schoolName,
      curriculum: "other",
      expected_graduation_year: null,
      preferences_universities: null,
      preferences_universities_notes: null,
      final_grade: "—",
      gpa: null,
      sat: null,
      act: null,
      ielts: null,
      toefl: null,
      inteended_fields: "—",
      open_to_realted_fields: false,
      preferred_uni_or_countries: "—",
      extracurricular_activities: "—",
      awards: null,
      additional_notes: FREE_FUNNEL_APPLICATION_SUPPORT_SOURCE,
      plan_id: plan.id,
      package_data: {
        ...DEFAULT_APPLICATION_PACKAGE_DATA,
        universitiesTotal: plan.universities_count,
      },
      status: "intake_draft",
    };

    const { data: appRow, error: insErr } = await secret
      .from("applications")
      .insert(insertRow)
      .select("id")
      .single();

    if (insErr || !appRow) {
      console.error("[startFreeFunnelApplicationSupport] insert", insErr);
      return { ok: false, error: "Could not start application support. Please try again." };
    }

    applicationId = appRow.id;

    const assignment = await assignFreeFunnelApplicationToReceivingAdvisor(secret, {
      applicationId,
      studentId: actor.studentId,
    });

    if (assignment.assigned && assignment.advisorName) {
      const { error: assignLogErr } = await secret.from("acitivity_logs").insert({
        entitiy_type: APPLICATION_ACTIVITY_ENTITY_TYPE,
        entity_id: applicationActivityEntityId(applicationId),
        action: "application_advisor_assigned",
        message: `Automatically assigned ${assignment.advisorName} as free-funnel application support advisor on application #${applicationId}.`,
        created_by_type: "student",
        admin_id: null,
        school_admin_id: null,
        student_id: actor.studentId,
      });
      if (assignLogErr) {
        console.error(
          "[startFreeFunnelApplicationSupport] advisor assignment activity log",
          assignLogErr,
        );
      }
    }
  } else {
    await assignFreeFunnelApplicationToReceivingAdvisor(secret, {
      applicationId,
      studentId: actor.studentId,
    });
  }

  const advisorName =
    `${receivingAdvisor.firstName} ${receivingAdvisor.lastName}`.trim() || "Advisor";

  const calendlyUrl = buildCalendlySchedulingPageUrl({
    base: receivingAdvisor.calendlySchedulingUrl,
    name: fullName,
    email,
    utmContent: applicationUtmContent(applicationId),
    ctxParts: [
      "Package: TBD after onboarding",
      `Application ref: #${applicationId}`,
      `Advisor: ${advisorName}`,
      "Source: Free funnel dashboard",
    ],
  });

  return { ok: true, calendlyUrl, applicationId };
}
