"use server";

import { assertAdvisorAccess } from "@/lib/advisor-access";
import {
  clearAdvisorSessionLeadQualification,
  createApplicationLeadFromAdvisorSession,
  markAdvisorSessionNotSuitable,
  markApplicationLeadNotSuitable,
  markPostAdmissionLeadNotSuitable,
  promoteApplicationIntakeDraftToLead,
  promotePostAdmissionIntakeDraftToLead,
} from "@/lib/promote-session-lead";
import {
  leadQualificationToStored,
  parseLeadQualification,
  type SessionLeadQualificationSource,
} from "@/lib/session-lead-qualification";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

type Result = { ok: true } | { ok: false; error: string };

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(id) || id < 1) return null;
  return id;
}

function revalidateLeadPaths(extra?: { applicationId?: number; caseId?: number; sessionId?: number }) {
  revalidatePath("/advisor/sessions-and-calls");
  revalidatePath("/advisor/leads");
  revalidatePath("/advisor/applications");
  revalidatePath("/advisor/post-admission");
  if (extra?.applicationId != null) {
    revalidatePath(`/advisor/applications/${extra.applicationId}`);
  }
  if (extra?.caseId != null) {
    revalidatePath(`/advisor/post-admission/${extra.caseId}`);
  }
  if (extra?.sessionId != null) {
    revalidatePath(`/advisor/sessions-and-calls/session/${extra.sessionId}`);
  }
}

async function clearApplicationLeadQualification(
  applicationId: number,
  advisorId: string,
): Promise<Result> {
  const secret = await createSupabaseSecretClient();
  const { data: existing, error } = await secret
    .from("applications")
    .select("id, status, assigned_to")
    .eq("id", applicationId)
    .maybeSingle();

  if (error || !existing) {
    return { ok: false, error: "Application not found." };
  }
  if (existing.assigned_to !== advisorId) {
    return { ok: false, error: "You do not have access to this application." };
  }

  const now = new Date().toISOString();

  // Live leads cannot be reverted to None — keep Good lead.
  if (existing.status === "lead") {
    const { error: keepErr } = await secret
      .from("applications")
      .update({
        lead_qualification: "good_lead",
        lead_qualified_at: now,
        updated_at: now,
      })
      .eq("id", applicationId);
    if (keepErr) {
      return { ok: false, error: "Could not update lead qualification." };
    }
    return { ok: true };
  }

  // From not_suitable (or other), clear back to intake_draft + None.
  const nextStatus =
    existing.status === "not_suitable" ? "intake_draft" : existing.status;

  const { error: updateErr } = await secret
    .from("applications")
    .update({
      status: nextStatus,
      lead_qualification: null,
      lead_qualified_at: null,
      blocked_at: null,
      updated_at: now,
    })
    .eq("id", applicationId);

  if (updateErr) {
    console.error("[clearApplicationLeadQualification]", updateErr);
    return { ok: false, error: "Could not clear lead qualification." };
  }

  return { ok: true };
}

async function clearPostAdmissionLeadQualification(
  caseId: number,
  advisorId: string,
): Promise<Result> {
  const secret = await createSupabaseSecretClient();
  const { data: existing, error } = await secret
    .from("post_admission_cases")
    .select("id, status, assigned_to")
    .eq("id", caseId)
    .maybeSingle();

  if (error || !existing) {
    return { ok: false, error: "Post-admission case not found." };
  }
  if (existing.assigned_to !== advisorId) {
    return { ok: false, error: "You do not have access to this case." };
  }

  const now = new Date().toISOString();

  if (existing.status === "lead") {
    const { error: keepErr } = await secret
      .from("post_admission_cases")
      .update({
        lead_qualification: "good_lead",
        lead_qualified_at: now,
        updated_at: now,
      })
      .eq("id", caseId);
    if (keepErr) {
      return { ok: false, error: "Could not update lead qualification." };
    }
    return { ok: true };
  }

  const nextStatus =
    existing.status === "not_suitable" ? "intake_draft" : existing.status;

  const { error: updateErr } = await secret
    .from("post_admission_cases")
    .update({
      status: nextStatus,
      lead_qualification: null,
      lead_qualified_at: null,
      blocked_at: null,
      updated_at: now,
    })
    .eq("id", caseId);

  if (updateErr) {
    console.error("[clearPostAdmissionLeadQualification]", updateErr);
    return { ok: false, error: "Could not clear lead qualification." };
  }

  return { ok: true };
}

/**
 * Update Sessions & Calls lead-outcome dropdown for any row kind.
 * - none: clear stored qualification (does not delete already-created leads)
 * - not_suitable: persist decision only (no lead created / demote draft+lead to not_suitable)
 * - good_lead: create or promote the service-specific lead
 */
export async function updateAdvisorSessionLeadQualification(
  sourceRaw: string,
  idRaw: string,
  qualificationRaw: string,
): Promise<Result> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;

  const source = sourceRaw.trim() as SessionLeadQualificationSource;
  if (
    source !== "advisor_session" &&
    source !== "application_lead" &&
    source !== "post_admission_lead"
  ) {
    return { ok: false, error: "Invalid session source." };
  }

  const id = parseId(idRaw);
  if (id == null) {
    return { ok: false, error: "Invalid row id." };
  }

  const qualification = parseLeadQualification(qualificationRaw);
  // Ensure only none / good_lead / not_suitable are accepted (already via parse).
  leadQualificationToStored(qualification);

  const secret = await createSupabaseSecretClient();

  if (source === "advisor_session") {
    if (qualification === "none") {
      const result = await clearAdvisorSessionLeadQualification(secret, {
        sessionId: id,
        advisorId: access.advisorId,
      });
      if (!result.ok) return result;
      revalidateLeadPaths({ sessionId: id });
      return { ok: true };
    }
    if (qualification === "not_suitable") {
      const result = await markAdvisorSessionNotSuitable(secret, {
        sessionId: id,
        advisorId: access.advisorId,
        advisorName: access.advisorName,
      });
      if (!result.ok) return result;
      revalidateLeadPaths({ sessionId: id });
      return { ok: true };
    }
    const result = await createApplicationLeadFromAdvisorSession(secret, {
      sessionId: id,
      advisorId: access.advisorId,
      advisorName: access.advisorName,
    });
    if (!result.ok) return result;
    revalidateLeadPaths({ sessionId: id, applicationId: result.applicationId });
    return { ok: true };
  }

  if (source === "application_lead") {
    if (qualification === "none") {
      const result = await clearApplicationLeadQualification(id, access.advisorId);
      if (!result.ok) return result;
      revalidateLeadPaths({ applicationId: id });
      return { ok: true };
    }
    if (qualification === "not_suitable") {
      const result = await markApplicationLeadNotSuitable(secret, {
        applicationId: id,
        advisorId: access.advisorId,
        advisorName: access.advisorName,
      });
      if (!result.ok) return result;
      revalidateLeadPaths({ applicationId: id });
      return { ok: true };
    }
    const result = await promoteApplicationIntakeDraftToLead(secret, {
      applicationId: id,
      advisorId: access.advisorId,
      advisorName: access.advisorName,
    });
    if (!result.ok) return result;
    revalidateLeadPaths({ applicationId: result.applicationId });
    return { ok: true };
  }

  // post_admission_lead
  if (qualification === "none") {
    const result = await clearPostAdmissionLeadQualification(id, access.advisorId);
    if (!result.ok) return result;
    revalidateLeadPaths({ caseId: id });
    return { ok: true };
  }
  if (qualification === "not_suitable") {
    const result = await markPostAdmissionLeadNotSuitable(secret, {
      caseId: id,
      advisorId: access.advisorId,
      advisorName: access.advisorName,
    });
    if (!result.ok) return result;
    revalidateLeadPaths({ caseId: id });
    return { ok: true };
  }

  const result = await promotePostAdmissionIntakeDraftToLead(secret, {
    caseId: id,
    advisorId: access.advisorId,
    advisorName: access.advisorName,
  });
  if (!result.ok) return result;
  revalidateLeadPaths({ caseId: result.caseId });
  return { ok: true };
}
