import "server-only";

import {
  APPLICATION_ACTIVITY_ENTITY_TYPE,
  applicationActivityEntityId,
} from "@/lib/application-activity-log";
import {
  ACTIVE_APPLICATION_STATUSES,
  buildEmptyStubApplicationInsert,
  fetchSmallestActivePlan,
  mapApplicationSupportPayloadToApplicationFields,
  parseApplicationSupportPayloadFromApplication,
  resolvePlanUniversitiesCount,
  type ApplicationSupportPayload,
} from "@/lib/application-support-intake";
import { ensureStudentApplicationDocuments } from "@/lib/ensure-student-application-documents";
import { getCountryNameByAlpha2 } from "@/lib/countries";
import {
  POST_ADMISSION_ACTIVITY_ENTITY_TYPE,
  postAdmissionActivityEntityId,
} from "@/lib/post-admission-activity-log";
import type { createSupabaseSecretClient } from "@/utils/supabase-server";

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

function firstEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

async function loadStudentSchoolContext(
  secret: SecretClient,
  studentId: string,
): Promise<{
  schoolId: string | null;
  schoolName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
}> {
  const { data: profile } = await secret
    .from("student_profiles")
    .select("school_id, first_name, last_name, email, phone, schools ( name )")
    .eq("id", studentId)
    .maybeSingle();

  type ProfileWithSchool = {
    school_id: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    schools: { name: string } | { name: string }[] | null;
  };

  const row = profile as ProfileWithSchool | null;
  const school = firstEmbed(row?.schools);
  return {
    schoolId: row?.school_id ?? null,
    schoolName: school?.name?.trim() || null,
    firstName: row?.first_name?.trim() || null,
    lastName: row?.last_name?.trim() || null,
    email: row?.email?.trim() || null,
    phone: row?.phone?.trim() || null,
  };
}

/** Promote an application-support intake draft to a real lead, preserving intake fields. */
export async function promoteApplicationIntakeDraftToLead(
  secret: SecretClient,
  input: {
    applicationId: number;
    advisorId: string;
    advisorName: string;
  },
): Promise<{ ok: true; applicationId: number } | { ok: false; error: string }> {
  const now = new Date().toISOString();
  const { data: existing, error: fetchErr } = await secret
    .from("applications")
    .select("id, student_id, status, lead_qualification, assigned_to")
    .eq("id", input.applicationId)
    .maybeSingle();

  if (fetchErr || !existing) {
    console.error("[promoteApplicationIntakeDraftToLead] fetch", fetchErr);
    return { ok: false, error: "Application not found." };
  }

  if (existing.assigned_to !== input.advisorId) {
    return { ok: false, error: "You do not have access to this application." };
  }

  if (existing.status === "lead" && existing.lead_qualification === "good_lead") {
    return { ok: true, applicationId: existing.id };
  }

  if (existing.status === "lead") {
    const { error: qualErr } = await secret
      .from("applications")
      .update({
        lead_qualification: "good_lead",
        lead_qualified_at: now,
        updated_at: now,
      })
      .eq("id", existing.id);
    if (qualErr) {
      console.error("[promoteApplicationIntakeDraftToLead] qualify existing lead", qualErr);
      return { ok: false, error: "Could not update lead qualification." };
    }
    return { ok: true, applicationId: existing.id };
  }

  if (existing.status !== "intake_draft") {
    return {
      ok: false,
      error: "Only intake drafts or leads can be marked as Good lead.",
    };
  }

  const { error: updateErr } = await secret
    .from("applications")
    .update({
      status: "lead",
      lead_qualification: "good_lead",
      lead_qualified_at: now,
      assigned_to: input.advisorId,
      assigned_at: now,
      updated_at: now,
    })
    .eq("id", existing.id);

  if (updateErr) {
    console.error("[promoteApplicationIntakeDraftToLead] update", updateErr);
    return { ok: false, error: "Could not promote application intake to a lead." };
  }

  await secret.from("acitivity_logs").insert({
    entitiy_type: APPLICATION_ACTIVITY_ENTITY_TYPE,
    entity_id: applicationActivityEntityId(existing.id),
    action: "application_lead_qualified_from_intake",
    message: `${input.advisorName} marked application support intake #${existing.id} as a Good lead.`,
    created_by_type: "admin",
    admin_id: null,
    school_admin_id: null,
    student_id: existing.student_id,
  });

  return { ok: true, applicationId: existing.id };
}

/** Mark application as not suitable without promoting to lead. */
export async function markApplicationLeadNotSuitable(
  secret: SecretClient,
  input: {
    applicationId: number;
    advisorId: string;
    advisorName: string;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = new Date().toISOString();
  const { data: existing, error: fetchErr } = await secret
    .from("applications")
    .select("id, student_id, status, assigned_to")
    .eq("id", input.applicationId)
    .maybeSingle();

  if (fetchErr || !existing) {
    return { ok: false, error: "Application not found." };
  }
  if (existing.assigned_to !== input.advisorId) {
    return { ok: false, error: "You do not have access to this application." };
  }

  const nextStatus =
    existing.status === "intake_draft" || existing.status === "lead"
      ? "not_suitable"
      : existing.status;

  const { error: updateErr } = await secret
    .from("applications")
    .update({
      status: nextStatus,
      lead_qualification: "not_suitable",
      lead_qualified_at: now,
      blocked_at: now,
      updated_at: now,
    })
    .eq("id", existing.id);

  if (updateErr) {
    console.error("[markApplicationLeadNotSuitable]", updateErr);
    return { ok: false, error: "Could not update lead qualification." };
  }

  await secret.from("acitivity_logs").insert({
    entitiy_type: APPLICATION_ACTIVITY_ENTITY_TYPE,
    entity_id: applicationActivityEntityId(existing.id),
    action: "application_lead_marked_not_suitable",
    message: `${input.advisorName} marked application #${existing.id} as Not suitable.`,
    created_by_type: "admin",
    admin_id: null,
    school_admin_id: null,
    student_id: existing.student_id,
  });

  return { ok: true };
}

/** Record that the student did not attend without changing application status. */
export async function markApplicationLeadNoShow(
  secret: SecretClient,
  input: {
    applicationId: number;
    advisorId: string;
    advisorName: string;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = new Date().toISOString();
  const { data: existing, error: fetchErr } = await secret
    .from("applications")
    .select("id, student_id, assigned_to")
    .eq("id", input.applicationId)
    .maybeSingle();

  if (fetchErr || !existing) {
    return { ok: false, error: "Application not found." };
  }
  if (existing.assigned_to !== input.advisorId) {
    return { ok: false, error: "You do not have access to this application." };
  }

  const { error: updateErr } = await secret
    .from("applications")
    .update({
      lead_qualification: "no_show",
      lead_qualified_at: now,
      updated_at: now,
    })
    .eq("id", existing.id);

  if (updateErr) {
    console.error("[markApplicationLeadNoShow]", updateErr);
    return { ok: false, error: "Could not update lead qualification." };
  }

  await secret.from("acitivity_logs").insert({
    entitiy_type: APPLICATION_ACTIVITY_ENTITY_TYPE,
    entity_id: applicationActivityEntityId(existing.id),
    action: "application_lead_marked_no_show",
    message: `${input.advisorName} marked application #${existing.id} as No show.`,
    created_by_type: "admin",
    admin_id: null,
    school_admin_id: null,
    student_id: existing.student_id,
  });

  return { ok: true };
}

export async function promotePostAdmissionIntakeDraftToLead(
  secret: SecretClient,
  input: {
    caseId: number;
    advisorId: string;
    advisorName: string;
  },
): Promise<{ ok: true; caseId: number } | { ok: false; error: string }> {
  const now = new Date().toISOString();
  const { data: existing, error: fetchErr } = await secret
    .from("post_admission_cases")
    .select("id, student_id, status, lead_qualification, assigned_to")
    .eq("id", input.caseId)
    .maybeSingle();

  if (fetchErr || !existing) {
    return { ok: false, error: "Post-admission case not found." };
  }
  if (existing.assigned_to !== input.advisorId) {
    return { ok: false, error: "You do not have access to this case." };
  }

  if (existing.status === "lead" && existing.lead_qualification === "good_lead") {
    return { ok: true, caseId: existing.id };
  }

  if (existing.status === "lead") {
    const { error: qualErr } = await secret
      .from("post_admission_cases")
      .update({
        lead_qualification: "good_lead",
        lead_qualified_at: now,
        updated_at: now,
      })
      .eq("id", existing.id);
    if (qualErr) {
      return { ok: false, error: "Could not update lead qualification." };
    }
    return { ok: true, caseId: existing.id };
  }

  if (existing.status !== "intake_draft") {
    return {
      ok: false,
      error: "Only intake drafts or leads can be marked as Good lead.",
    };
  }

  const { error: updateErr } = await secret
    .from("post_admission_cases")
    .update({
      status: "lead",
      lead_qualification: "good_lead",
      lead_qualified_at: now,
      assigned_to: input.advisorId,
      assigned_at: now,
      updated_at: now,
    })
    .eq("id", existing.id);

  if (updateErr) {
    console.error("[promotePostAdmissionIntakeDraftToLead]", updateErr);
    return { ok: false, error: "Could not promote post-admission intake to a lead." };
  }

  await secret.from("acitivity_logs").insert({
    entitiy_type: POST_ADMISSION_ACTIVITY_ENTITY_TYPE,
    entity_id: postAdmissionActivityEntityId(existing.id),
    action: "post_admission_lead_qualified_from_intake",
    message: `${input.advisorName} marked post-admission intake #${existing.id} as a Good lead.`,
    created_by_type: "admin",
    admin_id: null,
    school_admin_id: null,
    student_id: existing.student_id,
  });

  return { ok: true, caseId: existing.id };
}

export async function markPostAdmissionLeadNotSuitable(
  secret: SecretClient,
  input: {
    caseId: number;
    advisorId: string;
    advisorName: string;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = new Date().toISOString();
  const { data: existing, error: fetchErr } = await secret
    .from("post_admission_cases")
    .select("id, student_id, status, assigned_to")
    .eq("id", input.caseId)
    .maybeSingle();

  if (fetchErr || !existing) {
    return { ok: false, error: "Post-admission case not found." };
  }
  if (existing.assigned_to !== input.advisorId) {
    return { ok: false, error: "You do not have access to this case." };
  }

  const nextStatus =
    existing.status === "intake_draft" || existing.status === "lead"
      ? "not_suitable"
      : existing.status;

  const { error: updateErr } = await secret
    .from("post_admission_cases")
    .update({
      status: nextStatus,
      lead_qualification: "not_suitable",
      lead_qualified_at: now,
      blocked_at: now,
      updated_at: now,
    })
    .eq("id", existing.id);

  if (updateErr) {
    console.error("[markPostAdmissionLeadNotSuitable]", updateErr);
    return { ok: false, error: "Could not update lead qualification." };
  }

  await secret.from("acitivity_logs").insert({
    entitiy_type: POST_ADMISSION_ACTIVITY_ENTITY_TYPE,
    entity_id: postAdmissionActivityEntityId(existing.id),
    action: "post_admission_lead_marked_not_suitable",
    message: `${input.advisorName} marked post-admission case #${existing.id} as Not suitable.`,
    created_by_type: "admin",
    admin_id: null,
    school_admin_id: null,
    student_id: existing.student_id,
  });

  return { ok: true };
}

export async function markPostAdmissionLeadNoShow(
  secret: SecretClient,
  input: {
    caseId: number;
    advisorId: string;
    advisorName: string;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = new Date().toISOString();
  const { data: existing, error: fetchErr } = await secret
    .from("post_admission_cases")
    .select("id, student_id, assigned_to")
    .eq("id", input.caseId)
    .maybeSingle();

  if (fetchErr || !existing) {
    return { ok: false, error: "Post-admission case not found." };
  }
  if (existing.assigned_to !== input.advisorId) {
    return { ok: false, error: "You do not have access to this case." };
  }

  const { error: updateErr } = await secret
    .from("post_admission_cases")
    .update({
      lead_qualification: "no_show",
      lead_qualified_at: now,
      updated_at: now,
    })
    .eq("id", existing.id);

  if (updateErr) {
    console.error("[markPostAdmissionLeadNoShow]", updateErr);
    return { ok: false, error: "Could not update lead qualification." };
  }

  await secret.from("acitivity_logs").insert({
    entitiy_type: POST_ADMISSION_ACTIVITY_ENTITY_TYPE,
    entity_id: postAdmissionActivityEntityId(existing.id),
    action: "post_admission_lead_marked_no_show",
    message: `${input.advisorName} marked post-admission case #${existing.id} as No show.`,
    created_by_type: "admin",
    admin_id: null,
    school_admin_id: null,
    student_id: existing.student_id,
  });

  return { ok: true };
}

async function findPriorApplicationIntakeForStudent(
  secret: SecretClient,
  studentId: string,
): Promise<ApplicationSupportPayload | null> {
  const { data, error } = await secret
    .from("applications")
    .select(
      `
      student_name,
      student_email,
      student_phone,
      school_name,
      final_grade,
      inteended_fields,
      preferred_uni_or_countries,
      preferences_universities,
      preferences_universities_notes,
      additional_notes,
      applications_plans!applications_plan_id_fkey ( universities_count )
    `,
    )
    .eq("student_id", studentId)
    .in("status", [...ACTIVE_APPLICATION_STATUSES, "not_suitable"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[findPriorApplicationIntakeForStudent]", error);
    return null;
  }

  const plan = firstEmbed(data.applications_plans);
  return parseApplicationSupportPayloadFromApplication(
    data,
    resolvePlanUniversitiesCount(plan?.universities_count),
  );
}

/** Create an application-support lead from a regular advisor session booking. */
export async function createApplicationLeadFromAdvisorSession(
  secret: SecretClient,
  input: {
    sessionId: number;
    advisorId: string;
    advisorName: string;
  },
): Promise<{ ok: true; applicationId: number } | { ok: false; error: string }> {
  const now = new Date().toISOString();
  const { data: session, error: fetchErr } = await secret
    .from("advisor_sessions")
    .select(
      `
      id,
      advisor_id,
      student_id,
      student_name,
      student_email,
      student_phone,
      destination_country_code,
      current_stage,
      specific_uni,
      help_with,
      lead_qualification,
      created_lead_application_id
    `,
    )
    .eq("id", input.sessionId)
    .maybeSingle();

  if (fetchErr || !session) {
    return { ok: false, error: "Session not found." };
  }
  if (session.advisor_id !== input.advisorId) {
    return { ok: false, error: "You do not have access to this session." };
  }

  if (session.created_lead_application_id) {
    await secret
      .from("advisor_sessions")
      .update({
        lead_qualification: "good_lead",
        lead_qualified_at: now,
        updated_at: now,
      })
      .eq("id", session.id);
    return { ok: true, applicationId: session.created_lead_application_id };
  }

  const schoolCtx = await loadStudentSchoolContext(secret, session.student_id);
  const priorIntake = await findPriorApplicationIntakeForStudent(
    secret,
    session.student_id,
  );

  const plan = await fetchSmallestActivePlan(secret);
  if (!plan) {
    return {
      ok: false,
      error: "Application plans are not configured. Please contact support.",
    };
  }

  const destinationLabel = session.destination_country_code
    ? getCountryNameByAlpha2(session.destination_country_code) ??
      session.destination_country_code
    : "";

  const studentName =
    session.student_name?.trim() ||
    priorIntake?.studentName?.trim() ||
    [schoolCtx.firstName, schoolCtx.lastName].filter(Boolean).join(" ").trim() ||
    "Student";
  const studentEmail =
    session.student_email?.trim() ||
    priorIntake?.email?.trim() ||
    schoolCtx.email ||
    "";
  const studentPhone =
    session.student_phone?.trim() ||
    priorIntake?.phone?.trim() ||
    schoolCtx.phone ||
    "";

  let insertRow;
  if (priorIntake) {
    const enriched: ApplicationSupportPayload = {
      ...priorIntake,
      studentName: studentName || priorIntake.studentName,
      email: studentEmail || priorIntake.email,
      phone: studentPhone || priorIntake.phone,
      schoolName: priorIntake.schoolName || schoolCtx.schoolName || "",
      destinations:
        priorIntake.destinations.length > 0
          ? priorIntake.destinations
          : destinationLabel
            ? [destinationLabel]
            : priorIntake.destinations,
      universities:
        priorIntake.universities.length > 0
          ? priorIntake.universities
          : session.specific_uni?.trim()
            ? [session.specific_uni.trim()]
            : [],
      uniNotes: [
        priorIntake.uniNotes?.trim() || "",
        session.current_stage?.trim()
          ? `Session stage: ${session.current_stage.trim()}`
          : "",
        session.help_with?.trim()
          ? `Session help with: ${session.help_with.trim()}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    };
    const mapped = mapApplicationSupportPayloadToApplicationFields(enriched, plan);
    insertRow = {
      student_id: session.student_id,
      school_id: schoolCtx.schoolId,
      ...mapped,
      curriculum: "other" as const,
      expected_graduation_year: null,
      gpa: null,
      sat: null,
      act: null,
      ielts: null,
      toefl: null,
      open_to_realted_fields: false,
      extracurricular_activities: "—",
      awards: null,
      status: "lead" as const,
      assigned_to: input.advisorId,
      assigned_at: now,
      scheduled_at: null,
      lead_qualification: "good_lead" as const,
      lead_qualified_at: now,
      updated_at: now,
    };
  } else {
    const stub = buildEmptyStubApplicationInsert({
      studentId: session.student_id,
      schoolId: schoolCtx.schoolId,
      advisorId: input.advisorId,
      planId: plan.id,
      planUniversitiesCount: plan.universities_count,
      studentName,
      studentEmail,
      studentPhone,
      schoolName: schoolCtx.schoolName,
    });
    const sessionNotes = [
      destinationLabel ? `Destination: ${destinationLabel}` : "",
      session.current_stage?.trim()
        ? `Current stage: ${session.current_stage.trim()}`
        : "",
      session.specific_uni?.trim()
        ? `Specific universities: ${session.specific_uni.trim()}`
        : "",
      session.help_with?.trim()
        ? `Help with: ${session.help_with.trim()}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    insertRow = {
      ...stub,
      preferred_uni_or_countries: destinationLabel || stub.preferred_uni_or_countries,
      additional_notes: sessionNotes || null,
      status: "lead" as const,
      lead_qualification: "good_lead" as const,
      lead_qualified_at: now,
    };
  }

  const { data: appRow, error: insErr } = await secret
    .from("applications")
    .insert(insertRow)
    .select("id")
    .single();

  if (insErr || !appRow) {
    console.error("[createApplicationLeadFromAdvisorSession] insert", insErr);
    return { ok: false, error: "Could not create application lead." };
  }

  const { error: sessionUpdateErr } = await secret
    .from("advisor_sessions")
    .update({
      lead_qualification: "good_lead",
      lead_qualified_at: now,
      created_lead_application_id: appRow.id,
      updated_at: now,
    })
    .eq("id", session.id);

  if (sessionUpdateErr) {
    console.error(
      "[createApplicationLeadFromAdvisorSession] session update",
      sessionUpdateErr,
    );
  }

  await secret.from("acitivity_logs").insert({
    entitiy_type: APPLICATION_ACTIVITY_ENTITY_TYPE,
    entity_id: applicationActivityEntityId(appRow.id),
    action: "application_lead_created_from_advisor_session",
    message: `${input.advisorName} marked advisor session #${session.id} as a Good lead and created application #${appRow.id}.`,
    created_by_type: "admin",
    admin_id: null,
    school_admin_id: null,
    student_id: session.student_id,
  });

  await ensureStudentApplicationDocuments(secret, session.student_id).catch((err) => {
    console.error("[createApplicationLeadFromAdvisorSession] documents", err);
  });

  return { ok: true, applicationId: appRow.id };
}

export async function markAdvisorSessionNotSuitable(
  secret: SecretClient,
  input: {
    sessionId: number;
    advisorId: string;
    advisorName: string;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = new Date().toISOString();
  const { data: session, error: fetchErr } = await secret
    .from("advisor_sessions")
    .select("id, advisor_id, student_id")
    .eq("id", input.sessionId)
    .maybeSingle();

  if (fetchErr || !session) {
    return { ok: false, error: "Session not found." };
  }
  if (session.advisor_id !== input.advisorId) {
    return { ok: false, error: "You do not have access to this session." };
  }

  const { error: updateErr } = await secret
    .from("advisor_sessions")
    .update({
      lead_qualification: "not_suitable",
      lead_qualified_at: now,
      updated_at: now,
    })
    .eq("id", session.id);

  if (updateErr) {
    console.error("[markAdvisorSessionNotSuitable]", updateErr);
    return { ok: false, error: "Could not update lead qualification." };
  }

  await secret.from("acitivity_logs").insert({
    entitiy_type: "advisor",
    entity_id: input.advisorId,
    action: "advisor_session_marked_not_suitable",
    message: `${input.advisorName} marked advisor session #${session.id} as Not suitable.`,
    created_by_type: "admin",
    admin_id: null,
    school_admin_id: null,
    student_id: session.student_id,
  });

  return { ok: true };
}

export async function markAdvisorSessionNoShow(
  secret: SecretClient,
  input: {
    sessionId: number;
    advisorId: string;
    advisorName: string;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = new Date().toISOString();
  const { data: session, error: fetchErr } = await secret
    .from("advisor_sessions")
    .select("id, advisor_id, student_id")
    .eq("id", input.sessionId)
    .maybeSingle();

  if (fetchErr || !session) {
    return { ok: false, error: "Session not found." };
  }
  if (session.advisor_id !== input.advisorId) {
    return { ok: false, error: "You do not have access to this session." };
  }

  const { error: updateErr } = await secret
    .from("advisor_sessions")
    .update({
      lead_qualification: "no_show",
      lead_qualified_at: now,
      updated_at: now,
    })
    .eq("id", session.id);

  if (updateErr) {
    console.error("[markAdvisorSessionNoShow]", updateErr);
    return { ok: false, error: "Could not update lead qualification." };
  }

  await secret.from("acitivity_logs").insert({
    entitiy_type: "advisor",
    entity_id: input.advisorId,
    action: "advisor_session_marked_no_show",
    message: `${input.advisorName} marked advisor session #${session.id} as No show.`,
    created_by_type: "admin",
    admin_id: null,
    school_admin_id: null,
    student_id: session.student_id,
  });

  return { ok: true };
}

export async function clearAdvisorSessionLeadQualification(
  secret: SecretClient,
  input: {
    sessionId: number;
    advisorId: string;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: session, error: fetchErr } = await secret
    .from("advisor_sessions")
    .select("id, advisor_id, created_lead_application_id")
    .eq("id", input.sessionId)
    .maybeSingle();

  if (fetchErr || !session) {
    return { ok: false, error: "Session not found." };
  }
  if (session.advisor_id !== input.advisorId) {
    return { ok: false, error: "You do not have access to this session." };
  }

  // Already created a lead — keep Good lead (cannot un-create by selecting None).
  if (session.created_lead_application_id) {
    const now = new Date().toISOString();
    await secret
      .from("advisor_sessions")
      .update({
        lead_qualification: "good_lead",
        lead_qualified_at: now,
        updated_at: now,
      })
      .eq("id", session.id);
    return { ok: true };
  }

  const { error: updateErr } = await secret
    .from("advisor_sessions")
    .update({
      lead_qualification: null,
      lead_qualified_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id);

  if (updateErr) {
    console.error("[clearAdvisorSessionLeadQualification]", updateErr);
    return { ok: false, error: "Could not clear lead qualification." };
  }

  return { ok: true };
}
