"use server";

import {
  assertAdvisorAccess,
  assertAdvisorAssignedApplication,
} from "@/lib/advisor-access";
import { parseApplicationId } from "@/lib/application-checklist-actions-core";
import {
  buildCreateUniversityTargetInput,
  buildUpdateUniversityTargetInput,
  clearUniversityDocRequirementFileCore,
  createUniversityTargetCore,
  deleteUniversityTargetCore,
  linkUniversityDocRequirementToChecklistCore,
  parseRequirementId,
  parseUniversityTargetId,
  updateUniversityDocRequirementStatusCore,
  updateUniversityTargetCore,
  updateUniversityTargetDecisionCore,
  updateUniversityTargetStatusCore,
  uploadUniversityDocRequirementCore,
  type UniversityTargetActionResult,
} from "@/lib/application-university-target-actions-core";
import { searchUniversitiesCatalog } from "@/lib/search-universities-catalog";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

function revalidateApplicationPaths(applicationId: number) {
  revalidatePath("/advisor/applications");
  revalidatePath(`/advisor/applications/${applicationId}`);
}

async function assertAdvisorCanAccessTarget(
  targetIdRaw: string,
): Promise<
  | { ok: true; advisorId: string; advisorName: string; targetId: string }
  | { ok: false; error: string }
> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;

  const targetId = parseUniversityTargetId(targetIdRaw);
  if (!targetId) return { ok: false, error: "Invalid university target." };

  const secret = await createSupabaseSecretClient();
  const { data: target, error } = await secret
    .from("application_university_targets")
    .select("application_id")
    .eq("id", targetId)
    .maybeSingle();

  if (error || !target) {
    return { ok: false, error: "University target not found." };
  }

  const assignment = await assertAdvisorAssignedApplication(
    access.advisorId,
    target.application_id,
  );
  if (!assignment.ok) return assignment;

  return {
    ok: true,
    advisorId: access.advisorId,
    advisorName: access.advisorName,
    targetId,
  };
}

async function assertAdvisorCanAccessRequirement(
  requirementIdRaw: string,
): Promise<
  | { ok: true; requirementId: string }
  | { ok: false; error: string }
> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;

  const requirementId = parseRequirementId(requirementIdRaw);
  if (!requirementId) return { ok: false, error: "Invalid document requirement." };

  const secret = await createSupabaseSecretClient();
  const { data: requirement, error } = await secret
    .from("application_university_document_requirements")
    .select(
      `
      id,
      application_university_targets!inner ( application_id )
    `,
    )
    .eq("id", requirementId)
    .maybeSingle();

  if (error || !requirement) {
    return { ok: false, error: "Document requirement not found." };
  }

  const targetEmbed = requirement.application_university_targets as
    | { application_id: number }
    | { application_id: number }[];
  const target = Array.isArray(targetEmbed) ? targetEmbed[0] : targetEmbed;
  if (!target) return { ok: false, error: "University target not found." };

  const assignment = await assertAdvisorAssignedApplication(
    access.advisorId,
    target.application_id,
  );
  if (!assignment.ok) return assignment;

  return { ok: true, requirementId };
}

export async function searchAdvisorUniversitiesForApplication(
  query: string,
): Promise<{ ok: true; results: Awaited<ReturnType<typeof searchUniversitiesCatalog>> } | { ok: false; error: string }> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;
  return { ok: true, results: await searchUniversitiesCatalog(query) };
}

export async function createAdvisorUniversityTarget(
  applicationIdRaw: string,
  input: {
    universityId?: string | null;
    universityName: string;
    program?: string | null;
    countryCode?: string | null;
    deadline?: string | null;
    portalUrl?: string | null;
    status: string;
    notes?: string | null;
    documentNames: string[];
  },
): Promise<UniversityTargetActionResult> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;

  const applicationId = parseApplicationId(applicationIdRaw);
  if (applicationId == null) return { ok: false, error: "Invalid application." };

  const assignment = await assertAdvisorAssignedApplication(
    access.advisorId,
    applicationId,
  );
  if (!assignment.ok) return assignment;

  const built = buildCreateUniversityTargetInput(input);
  if ("error" in built) return { ok: false, error: built.error };

  const secret = await createSupabaseSecretClient();
  const result = await createUniversityTargetCore(
    secret,
    applicationId,
    built,
    access.advisorName,
    null,
  );

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}

export async function updateAdvisorUniversityTarget(
  targetIdRaw: string,
  input: {
    universityId?: string | null;
    universityName: string;
    program?: string | null;
    countryCode?: string | null;
    deadline?: string | null;
    portalUrl?: string | null;
    decision: string;
    notes?: string | null;
  },
): Promise<UniversityTargetActionResult> {
  const access = await assertAdvisorCanAccessTarget(targetIdRaw);
  if (!access.ok) return access;

  const built = buildUpdateUniversityTargetInput(input);
  if ("error" in built) return { ok: false, error: built.error };

  const secret = await createSupabaseSecretClient();
  const result = await updateUniversityTargetCore(
    secret,
    access.targetId,
    built,
    access.advisorName,
    null,
  );

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}

export async function updateAdvisorUniversityTargetStatus(
  targetIdRaw: string,
  status: string,
): Promise<UniversityTargetActionResult> {
  const access = await assertAdvisorCanAccessTarget(targetIdRaw);
  if (!access.ok) return access;

  const secret = await createSupabaseSecretClient();
  const result = await updateUniversityTargetStatusCore(
    secret,
    access.targetId,
    status,
    access.advisorName,
    null,
  );

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}

export async function updateAdvisorUniversityTargetDecision(
  targetIdRaw: string,
  decision: string,
): Promise<UniversityTargetActionResult> {
  const access = await assertAdvisorCanAccessTarget(targetIdRaw);
  if (!access.ok) return access;

  const secret = await createSupabaseSecretClient();
  const result = await updateUniversityTargetDecisionCore(
    secret,
    access.targetId,
    decision,
    access.advisorName,
    null,
  );

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}

export async function deleteAdvisorUniversityTarget(
  targetIdRaw: string,
): Promise<UniversityTargetActionResult> {
  const access = await assertAdvisorCanAccessTarget(targetIdRaw);
  if (!access.ok) return access;

  const secret = await createSupabaseSecretClient();
  const result = await deleteUniversityTargetCore(
    secret,
    access.targetId,
    access.advisorName,
    null,
  );

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}

export async function updateAdvisorUniversityDocRequirementStatus(
  requirementIdRaw: string,
  status: string,
): Promise<UniversityTargetActionResult> {
  const access = await assertAdvisorCanAccessRequirement(requirementIdRaw);
  if (!access.ok) return access;

  const secret = await createSupabaseSecretClient();
  const result = await updateUniversityDocRequirementStatusCore(
    secret,
    access.requirementId,
    status,
  );

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}

export async function uploadAdvisorUniversityDocRequirement(
  requirementIdRaw: string,
  formData: FormData,
): Promise<UniversityTargetActionResult> {
  const access = await assertAdvisorCanAccessRequirement(requirementIdRaw);
  if (!access.ok) return access;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size < 1) {
    return { ok: false, error: "Choose a file to upload." };
  }

  const secret = await createSupabaseSecretClient();
  const result = await uploadUniversityDocRequirementCore(
    secret,
    access.requirementId,
    file,
  );

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}

export async function linkAdvisorUniversityDocRequirementToChecklist(
  requirementIdRaw: string,
  checklistDocumentIdRaw: string,
): Promise<UniversityTargetActionResult> {
  const access = await assertAdvisorCanAccessRequirement(requirementIdRaw);
  if (!access.ok) return access;

  const secret = await createSupabaseSecretClient();
  const result = await linkUniversityDocRequirementToChecklistCore(
    secret,
    access.requirementId,
    checklistDocumentIdRaw,
  );

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}

export async function clearAdvisorUniversityDocRequirementFile(
  requirementIdRaw: string,
): Promise<UniversityTargetActionResult> {
  const access = await assertAdvisorCanAccessRequirement(requirementIdRaw);
  if (!access.ok) return access;

  const secret = await createSupabaseSecretClient();
  const result = await clearUniversityDocRequirementFileCore(
    secret,
    access.requirementId,
  );

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}
