import {
  APPLICATION_ACTIVITY_ENTITY_TYPE,
  applicationActivityEntityId,
} from "@/lib/application-activity-log";
import {
  DEFAULT_APPLICATION_PACKAGE_DATA,
  parseApplicationPackageData,
  resolveApplicationUniversitiesTotal,
} from "@/lib/application-package-data";
import {
  MAX_UNIVERSITY_DOC_NAME,
  MAX_UNIVERSITY_DOC_REQUIREMENTS,
  MAX_UNIVERSITY_TARGET_NAME,
  MAX_UNIVERSITY_TARGET_NOTES,
  MAX_UNIVERSITY_TARGET_PROGRAM,
  parseUniversityDocRequirementStatus,
  parseUniversityTargetDecision,
  parseUniversityTargetStatus,
  type UniversityDocRequirementStatus,
  type UniversityTargetDecision,
  type UniversityTargetStatus,
} from "@/lib/application-university-target-constants";
import { updateApplicationPackageDataCore } from "@/lib/application-package-actions-core";
import { uploadUniversityTargetDocumentFile } from "@/lib/application-university-target-upload";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export type UniversityTargetActionResult =
  | { ok: true; applicationId?: number }
  | { ok: false; error: string };

export type CreateUniversityTargetInput = {
  universityId: string | null;
  universityName: string;
  program: string | null;
  countryCode: string | null;
  deadline: string | null;
  portalUrl: string | null;
  status: UniversityTargetStatus;
  notes: string | null;
  documentNames: string[];
};

export type UpdateUniversityTargetInput = {
  universityId: string | null;
  universityName: string;
  program: string | null;
  countryCode: string | null;
  deadline: string | null;
  portalUrl: string | null;
  decision: UniversityTargetDecision;
  notes: string | null;
};

export function parseUniversityTargetId(raw: string): string | null {
  const id = raw.trim();
  return UUID_RE.test(id) ? id : null;
}

export function parseRequirementId(raw: string): string | null {
  const id = raw.trim();
  return UUID_RE.test(id) ? id : null;
}

function normalizeOptionalText(value: string | null | undefined, max: number): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function normalizeDocumentNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const name = raw.trim().slice(0, MAX_UNIVERSITY_DOC_NAME);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
    if (result.length >= MAX_UNIVERSITY_DOC_REQUIREMENTS) break;
  }
  return result;
}

function parseOptionalDate(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const value = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

function parseOptionalCountryCode(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return code;
}

function parseOptionalUniversityId(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const id = raw.trim();
  return UUID_RE.test(id) ? id : null;
}

async function loadApplicationContext(secret: SecretClient, applicationId: number) {
  const { data, error } = await secret
    .from("applications")
    .select(
      `
      id,
      student_id,
      package_data,
      applications_plans ( universities_count )
    `,
    )
    .eq("id", applicationId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

async function countTargets(secret: SecretClient, applicationId: number): Promise<number> {
  const { count, error } = await secret
    .from("application_university_targets")
    .select("id", { count: "exact", head: true })
    .eq("application_id", applicationId);

  if (error) {
    console.error("[university-target] count", error);
    return 0;
  }
  return count ?? 0;
}

async function syncPackageCounters(
  secret: SecretClient,
  applicationId: number,
): Promise<void> {
  const { data: targets, error } = await secret
    .from("application_university_targets")
    .select("status")
    .eq("application_id", applicationId);

  if (error) {
    console.error("[university-target] sync package", error);
    return;
  }

  const rows = targets ?? [];
  await updateApplicationPackageDataCore(secret, applicationId, {
    universitiesAdded: rows.length,
    applicationsSubmitted: rows.filter((r) => r.status === "submitted").length,
  });
}

async function insertUniversityTargetActivityLog(
  secret: SecretClient,
  input: {
    applicationId: number;
    studentId: string;
    action: string;
    message: string;
    adminId?: string | null;
  },
) {
  const { error } = await secret.from("acitivity_logs").insert({
    entitiy_type: APPLICATION_ACTIVITY_ENTITY_TYPE,
    entity_id: applicationActivityEntityId(input.applicationId),
    action: input.action,
    message: input.message,
    created_by_type: "admin",
    admin_id: input.adminId ?? null,
    school_admin_id: null,
    student_id: input.studentId,
  });

  if (error) {
    console.error("[university-target] activity log", error);
  }
}

async function loadTarget(secret: SecretClient, targetId: string) {
  const { data, error } = await secret
    .from("application_university_targets")
    .select("id, application_id, university_name")
    .eq("id", targetId)
    .maybeSingle();

  if (error) {
    console.error("[university-target] load target", error);
    return null;
  }
  return data;
}

async function loadRequirementWithTarget(secret: SecretClient, requirementId: string) {
  const { data, error } = await secret
    .from("application_university_document_requirements")
    .select(
      `
      id,
      display_name,
      university_target_id,
      application_university_targets!inner (
        id,
        application_id,
        university_name
      )
    `,
    )
    .eq("id", requirementId)
    .maybeSingle();

  if (error) {
    console.error("[university-target] load requirement", error);
    return null;
  }
  return data;
}

function resolvePlanLimit(application: NonNullable<Awaited<ReturnType<typeof loadApplicationContext>>>): number | null {
  const planEmbed = application.applications_plans as
    | { universities_count: number }
    | { universities_count: number }[]
    | null;
  const plan = Array.isArray(planEmbed) ? planEmbed[0] : planEmbed;
  const planCount = plan?.universities_count ?? 0;
  const packageData = parseApplicationPackageData(application.package_data);
  const total = resolveApplicationUniversitiesTotal(packageData, planCount);
  if (total < 1) return null;
  return total;
}

export async function createUniversityTargetCore(
  secret: SecretClient,
  applicationId: number,
  input: CreateUniversityTargetInput,
  actorName: string,
  adminId?: string | null,
): Promise<UniversityTargetActionResult> {
  const universityName = input.universityName.trim().slice(0, MAX_UNIVERSITY_TARGET_NAME);
  if (!universityName) {
    return { ok: false, error: "University name is required." };
  }

  const status = input.status;
  if (!parseUniversityTargetStatus(status)) {
    return { ok: false, error: "Invalid status." };
  }

  const application = await loadApplicationContext(secret, applicationId);
  if (!application) {
    return { ok: false, error: "Application not found." };
  }

  const planLimit = resolvePlanLimit(application);
  if (planLimit != null) {
    const currentCount = await countTargets(secret, applicationId);
    if (currentCount >= planLimit) {
      return {
        ok: false,
        error: `This package allows up to ${planLimit} universities.`,
      };
    }
  }

  const now = new Date().toISOString();
  const sortOrder = await countTargets(secret, applicationId);
  const documentNames = normalizeDocumentNames(input.documentNames);

  const { data: target, error: targetErr } = await secret
    .from("application_university_targets")
    .insert({
      application_id: applicationId,
      university_id: parseOptionalUniversityId(input.universityId),
      university_name: universityName,
      program: normalizeOptionalText(input.program, MAX_UNIVERSITY_TARGET_PROGRAM),
      country_code: parseOptionalCountryCode(input.countryCode),
      deadline: parseOptionalDate(input.deadline),
      portal_url: normalizeOptionalText(input.portalUrl, 500),
      status,
      notes: normalizeOptionalText(input.notes, MAX_UNIVERSITY_TARGET_NOTES),
      sort_order: sortOrder,
      updated_at: now,
    })
    .select("id")
    .single();

  if (targetErr || !target) {
    console.error("[createUniversityTargetCore]", targetErr);
    return { ok: false, error: "Could not add university." };
  }

  if (documentNames.length > 0) {
    const { error: reqErr } = await secret
      .from("application_university_document_requirements")
      .insert(
        documentNames.map((name, index) => ({
          university_target_id: target.id,
          display_name: name,
          status: "not_started" as const,
          sort_order: index,
          updated_at: now,
        })),
      );

    if (reqErr) {
      console.error("[createUniversityTargetCore] requirements", reqErr);
      await secret.from("application_university_targets").delete().eq("id", target.id);
      return { ok: false, error: "Could not save document requirements." };
    }
  }

  await secret.from("applications").update({ updated_at: now }).eq("id", applicationId);
  await syncPackageCounters(secret, applicationId);

  await insertUniversityTargetActivityLog(secret, {
    applicationId,
    studentId: application.student_id,
    adminId,
    action: "application_university_target_created",
    message: `${actorName} added "${universityName}" to application #${applicationId}.`,
  });

  return { ok: true, applicationId };
}

export async function updateUniversityTargetCore(
  secret: SecretClient,
  targetId: string,
  input: UpdateUniversityTargetInput,
  actorName: string,
  adminId?: string | null,
): Promise<UniversityTargetActionResult> {
  const target = await loadTarget(secret, targetId);
  if (!target) return { ok: false, error: "University target not found." };

  const universityName = input.universityName.trim().slice(0, MAX_UNIVERSITY_TARGET_NAME);
  if (!universityName) {
    return { ok: false, error: "University name is required." };
  }

  const decision = input.decision;
  if (!parseUniversityTargetDecision(decision)) {
    return { ok: false, error: "Invalid decision." };
  }

  const now = new Date().toISOString();
  const { error } = await secret
    .from("application_university_targets")
    .update({
      university_id: parseOptionalUniversityId(input.universityId),
      university_name: universityName,
      program: normalizeOptionalText(input.program, MAX_UNIVERSITY_TARGET_PROGRAM),
      country_code: parseOptionalCountryCode(input.countryCode),
      deadline: parseOptionalDate(input.deadline),
      portal_url: normalizeOptionalText(input.portalUrl, 500),
      decision,
      notes: normalizeOptionalText(input.notes, MAX_UNIVERSITY_TARGET_NOTES),
      updated_at: now,
    })
    .eq("id", targetId);

  if (error) {
    console.error("[updateUniversityTargetCore]", error);
    return { ok: false, error: "Could not update university." };
  }

  const { data: application } = await secret
    .from("applications")
    .select("student_id")
    .eq("id", target.application_id)
    .maybeSingle();

  if (application) {
    await insertUniversityTargetActivityLog(secret, {
      applicationId: target.application_id,
      studentId: application.student_id,
      adminId,
      action: "application_university_target_updated",
      message: `${actorName} updated "${universityName}" on application #${target.application_id}.`,
    });
  }

  await secret
    .from("applications")
    .update({ updated_at: now })
    .eq("id", target.application_id);

  return { ok: true, applicationId: target.application_id };
}

export async function updateUniversityTargetStatusCore(
  secret: SecretClient,
  targetId: string,
  statusRaw: string,
  actorName: string,
  adminId?: string | null,
): Promise<UniversityTargetActionResult> {
  const status = parseUniversityTargetStatus(statusRaw);
  if (!status) return { ok: false, error: "Invalid status." };

  const target = await loadTarget(secret, targetId);
  if (!target) return { ok: false, error: "University target not found." };

  const now = new Date().toISOString();
  const { error } = await secret
    .from("application_university_targets")
    .update({ status, updated_at: now })
    .eq("id", targetId);

  if (error) {
    console.error("[updateUniversityTargetStatusCore]", error);
    return { ok: false, error: "Could not update status." };
  }

  await syncPackageCounters(secret, target.application_id);

  const { data: application } = await secret
    .from("applications")
    .select("student_id")
    .eq("id", target.application_id)
    .maybeSingle();

  if (application) {
    await insertUniversityTargetActivityLog(secret, {
      applicationId: target.application_id,
      studentId: application.student_id,
      adminId,
      action: "application_university_target_status_changed",
      message: `${actorName} set "${target.university_name}" to ${status.replaceAll("_", " ")}.`,
    });
  }

  await secret
    .from("applications")
    .update({ updated_at: now })
    .eq("id", target.application_id);

  return { ok: true, applicationId: target.application_id };
}

export async function updateUniversityTargetDecisionCore(
  secret: SecretClient,
  targetId: string,
  decisionRaw: string,
  actorName: string,
  adminId?: string | null,
): Promise<UniversityTargetActionResult> {
  const decision = parseUniversityTargetDecision(decisionRaw);
  if (!decision) return { ok: false, error: "Invalid decision." };

  const target = await loadTarget(secret, targetId);
  if (!target) return { ok: false, error: "University target not found." };

  const now = new Date().toISOString();
  const { error } = await secret
    .from("application_university_targets")
    .update({ decision, updated_at: now })
    .eq("id", targetId);

  if (error) {
    console.error("[updateUniversityTargetDecisionCore]", error);
    return { ok: false, error: "Could not update decision." };
  }

  const { data: application } = await secret
    .from("applications")
    .select("student_id")
    .eq("id", target.application_id)
    .maybeSingle();

  if (application) {
    await insertUniversityTargetActivityLog(secret, {
      applicationId: target.application_id,
      studentId: application.student_id,
      adminId,
      action: "application_university_target_decision_changed",
      message: `${actorName} set "${target.university_name}" decision to ${decision.replaceAll("_", " ")}.`,
    });
  }

  await secret
    .from("applications")
    .update({ updated_at: now })
    .eq("id", target.application_id);

  return { ok: true, applicationId: target.application_id };
}

export async function deleteUniversityTargetCore(
  secret: SecretClient,
  targetId: string,
  actorName: string,
  adminId?: string | null,
): Promise<UniversityTargetActionResult> {
  const target = await loadTarget(secret, targetId);
  if (!target) return { ok: false, error: "University target not found." };

  const { error } = await secret
    .from("application_university_targets")
    .delete()
    .eq("id", targetId);

  if (error) {
    console.error("[deleteUniversityTargetCore]", error);
    return { ok: false, error: "Could not remove university." };
  }

  await syncPackageCounters(secret, target.application_id);

  const { data: application } = await secret
    .from("applications")
    .select("student_id")
    .eq("id", target.application_id)
    .maybeSingle();

  if (application) {
    await insertUniversityTargetActivityLog(secret, {
      applicationId: target.application_id,
      studentId: application.student_id,
      adminId,
      action: "application_university_target_deleted",
      message: `${actorName} removed "${target.university_name}" from application #${target.application_id}.`,
    });
  }

  const now = new Date().toISOString();
  await secret
    .from("applications")
    .update({ updated_at: now })
    .eq("id", target.application_id);

  return { ok: true, applicationId: target.application_id };
}

async function countRequirementsForTarget(
  secret: SecretClient,
  targetId: string,
): Promise<number> {
  const { count, error } = await secret
    .from("application_university_document_requirements")
    .select("id", { count: "exact", head: true })
    .eq("university_target_id", targetId);

  if (error) {
    console.error("[university-target] count requirements", error);
    return 0;
  }
  return count ?? 0;
}

export async function createUniversityDocRequirementCore(
  secret: SecretClient,
  targetId: string,
  displayNameRaw: string,
): Promise<UniversityTargetActionResult> {
  const target = await loadTarget(secret, targetId);
  if (!target) return { ok: false, error: "University target not found." };

  const displayName = displayNameRaw.trim().slice(0, MAX_UNIVERSITY_DOC_NAME);
  if (!displayName) {
    return { ok: false, error: "Document name is required." };
  }

  const currentCount = await countRequirementsForTarget(secret, targetId);
  if (currentCount >= MAX_UNIVERSITY_DOC_REQUIREMENTS) {
    return {
      ok: false,
      error: `This university allows up to ${MAX_UNIVERSITY_DOC_REQUIREMENTS} document requirements.`,
    };
  }

  const { data: existingRows, error: existingErr } = await secret
    .from("application_university_document_requirements")
    .select("display_name")
    .eq("university_target_id", targetId);

  if (existingErr) {
    console.error("[createUniversityDocRequirementCore] existing", existingErr);
    return { ok: false, error: "Could not add document requirement." };
  }

  const normalizedNew = displayName.toLowerCase();
  const hasDuplicate = (existingRows ?? []).some(
    (row) => row.display_name.trim().toLowerCase() === normalizedNew,
  );
  if (hasDuplicate) {
    return { ok: false, error: "A document with that name already exists." };
  }

  const now = new Date().toISOString();
  const { error } = await secret.from("application_university_document_requirements").insert({
    university_target_id: targetId,
    display_name: displayName,
    status: "not_started",
    sort_order: currentCount,
    updated_at: now,
  });

  if (error) {
    console.error("[createUniversityDocRequirementCore]", error);
    return { ok: false, error: "Could not add document requirement." };
  }

  await secret
    .from("applications")
    .update({ updated_at: now })
    .eq("id", target.application_id);

  return { ok: true, applicationId: target.application_id };
}

export async function deleteUniversityDocRequirementCore(
  secret: SecretClient,
  requirementId: string,
): Promise<UniversityTargetActionResult> {
  const requirement = await loadRequirementWithTarget(secret, requirementId);
  if (!requirement) return { ok: false, error: "Document requirement not found." };

  const targetEmbed = requirement.application_university_targets as
    | { id: string; application_id: number }
    | { id: string; application_id: number }[];
  const target = Array.isArray(targetEmbed) ? targetEmbed[0] : targetEmbed;
  if (!target) return { ok: false, error: "University target not found." };

  const { error } = await secret
    .from("application_university_document_requirements")
    .delete()
    .eq("id", requirementId);

  if (error) {
    console.error("[deleteUniversityDocRequirementCore]", error);
    return { ok: false, error: "Could not remove document requirement." };
  }

  const now = new Date().toISOString();
  await secret
    .from("applications")
    .update({ updated_at: now })
    .eq("id", target.application_id);

  return { ok: true, applicationId: target.application_id };
}

export async function updateUniversityDocRequirementStatusCore(
  secret: SecretClient,
  requirementId: string,
  statusRaw: string,
): Promise<UniversityTargetActionResult> {
  const status = parseUniversityDocRequirementStatus(statusRaw);
  if (!status) return { ok: false, error: "Invalid document status." };

  const requirement = await loadRequirementWithTarget(secret, requirementId);
  if (!requirement) return { ok: false, error: "Document requirement not found." };

  const targetEmbed = requirement.application_university_targets as
    | { id: string; application_id: number; university_name: string }
    | { id: string; application_id: number; university_name: string }[];
  const target = Array.isArray(targetEmbed) ? targetEmbed[0] : targetEmbed;
  if (!target) return { ok: false, error: "University target not found." };

  const now = new Date().toISOString();
  const { error } = await secret
    .from("application_university_document_requirements")
    .update({ status, updated_at: now })
    .eq("id", requirementId);

  if (error) {
    console.error("[updateUniversityDocRequirementStatusCore]", error);
    return { ok: false, error: "Could not update document status." };
  }

  await secret
    .from("applications")
    .update({ updated_at: now })
    .eq("id", target.application_id);

  return { ok: true, applicationId: target.application_id };
}

export async function uploadUniversityDocRequirementCore(
  secret: SecretClient,
  requirementId: string,
  file: File,
): Promise<UniversityTargetActionResult> {
  const result = await uploadUniversityTargetDocumentFile(secret, requirementId, file);
  if (!result.ok) return result;
  return { ok: true, applicationId: result.applicationId };
}

export async function linkUniversityDocRequirementToChecklistCore(
  secret: SecretClient,
  requirementId: string,
  checklistDocumentIdRaw: string,
): Promise<UniversityTargetActionResult> {
  const checklistDocumentId = parseRequirementId(checklistDocumentIdRaw);
  if (!checklistDocumentId) {
    return { ok: false, error: "Invalid checklist document." };
  }

  const requirement = await loadRequirementWithTarget(secret, requirementId);
  if (!requirement) return { ok: false, error: "Document requirement not found." };

  const targetEmbed = requirement.application_university_targets as
    | { id: string; application_id: number }
    | { id: string; application_id: number }[];
  const target = Array.isArray(targetEmbed) ? targetEmbed[0] : targetEmbed;
  if (!target) return { ok: false, error: "University target not found." };

  const { data: checklistDoc, error: checklistErr } = await secret
    .from("application_checklist_documents")
    .select("id, application_id, url, file_name, file_size, file_type, uploaded_at")
    .eq("id", checklistDocumentId)
    .maybeSingle();

  if (checklistErr || !checklistDoc) {
    return { ok: false, error: "Checklist document not found." };
  }

  if (checklistDoc.application_id !== target.application_id) {
    return { ok: false, error: "That document belongs to a different application." };
  }

  if (!checklistDoc.url?.trim()) {
    return { ok: false, error: "That checklist document has no file attached yet." };
  }

  const now = new Date().toISOString();
  const filePayload = {
    source_type: "checklist_link" as const,
    url: checklistDoc.url,
    file_name: checklistDoc.file_name,
    file_size: checklistDoc.file_size,
    file_type: checklistDoc.file_type,
    uploaded_at: checklistDoc.uploaded_at ?? now,
    checklist_document_id: checklistDoc.id,
    updated_at: now,
  };

  const { data: existing } = await secret
    .from("application_university_document_files")
    .select("id")
    .eq("requirement_id", requirementId)
    .maybeSingle();

  if (existing) {
    const { error } = await secret
      .from("application_university_document_files")
      .update(filePayload)
      .eq("id", existing.id);
    if (error) {
      console.error("[linkUniversityDocRequirementToChecklistCore] update", error);
      return { ok: false, error: "Could not link document." };
    }
  } else {
    const { error } = await secret
      .from("application_university_document_files")
      .insert({ requirement_id: requirementId, ...filePayload });
    if (error) {
      console.error("[linkUniversityDocRequirementToChecklistCore] insert", error);
      return { ok: false, error: "Could not link document." };
    }
  }

  await secret
    .from("applications")
    .update({ updated_at: now })
    .eq("id", target.application_id);

  return { ok: true, applicationId: target.application_id };
}

export async function clearUniversityDocRequirementFileCore(
  secret: SecretClient,
  requirementId: string,
): Promise<UniversityTargetActionResult> {
  const requirement = await loadRequirementWithTarget(secret, requirementId);
  if (!requirement) return { ok: false, error: "Document requirement not found." };

  const targetEmbed = requirement.application_university_targets as
    | { id: string; application_id: number }
    | { id: string; application_id: number }[];
  const target = Array.isArray(targetEmbed) ? targetEmbed[0] : targetEmbed;
  if (!target) return { ok: false, error: "University target not found." };

  const { error } = await secret
    .from("application_university_document_files")
    .delete()
    .eq("requirement_id", requirementId);

  if (error) {
    console.error("[clearUniversityDocRequirementFileCore]", error);
    return { ok: false, error: "Could not remove attachment." };
  }

  const now = new Date().toISOString();
  await secret
    .from("applications")
    .update({ updated_at: now })
    .eq("id", target.application_id);

  return { ok: true, applicationId: target.application_id };
}

export function buildCreateUniversityTargetInput(input: {
  universityId?: string | null;
  universityName: string;
  program?: string | null;
  countryCode?: string | null;
  deadline?: string | null;
  portalUrl?: string | null;
  status: string;
  notes?: string | null;
  documentNames?: string[];
}): CreateUniversityTargetInput | { error: string } {
  const status = parseUniversityTargetStatus(input.status);
  if (!status) return { error: "Invalid status." };

  return {
    universityId: input.universityId ?? null,
    universityName: input.universityName,
    program: input.program ?? null,
    countryCode: input.countryCode ?? null,
    deadline: input.deadline ?? null,
    portalUrl: input.portalUrl ?? null,
    status,
    notes: input.notes ?? null,
    documentNames: input.documentNames ?? [],
  };
}

export function buildUpdateUniversityTargetInput(input: {
  universityId?: string | null;
  universityName: string;
  program?: string | null;
  countryCode?: string | null;
  deadline?: string | null;
  portalUrl?: string | null;
  decision: string;
  notes?: string | null;
}): UpdateUniversityTargetInput | { error: string } {
  const decision = parseUniversityTargetDecision(input.decision);
  if (!decision) return { error: "Invalid decision." };

  return {
    universityId: input.universityId ?? null,
    universityName: input.universityName,
    program: input.program ?? null,
    countryCode: input.countryCode ?? null,
    deadline: input.deadline ?? null,
    portalUrl: input.portalUrl ?? null,
    decision,
    notes: input.notes ?? null,
  };
}

export type { UniversityDocRequirementStatus, UniversityTargetDecision, UniversityTargetStatus };
