"use server";

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
import { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

async function assertAdminAccess() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false as const, error: "You must be signed in." };
  }

  const secret = await createSupabaseSecretClient();
  const { data: admin, error } = await secret
    .from("admins")
    .select("id, first_name, last_name, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !admin) {
    return { ok: false as const, error: "You do not have permission to manage applications." };
  }

  if (admin.is_active === false) {
    return { ok: false as const, error: "Your admin account is inactive." };
  }

  return {
    ok: true as const,
    userId: user.id,
    actorName:
      [admin.first_name, admin.last_name].filter(Boolean).join(" ").trim() || "Admin",
  };
}

function revalidateApplicationPaths(applicationId: number) {
  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${applicationId}`);
}

export async function searchAdminUniversitiesForApplication(
  query: string,
): Promise<{ ok: true; results: Awaited<ReturnType<typeof searchUniversitiesCatalog>> } | { ok: false; error: string }> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;
  return { ok: true, results: await searchUniversitiesCatalog(query) };
}

export async function createAdminUniversityTarget(
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
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const applicationId = parseApplicationId(applicationIdRaw);
  if (applicationId == null) return { ok: false, error: "Invalid application." };

  const built = buildCreateUniversityTargetInput(input);
  if ("error" in built) return { ok: false, error: built.error };

  const secret = await createSupabaseSecretClient();
  const result = await createUniversityTargetCore(
    secret,
    applicationId,
    built,
    access.actorName,
    access.userId,
  );

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}

export async function updateAdminUniversityTarget(
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
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const targetId = parseUniversityTargetId(targetIdRaw);
  if (!targetId) return { ok: false, error: "Invalid university target." };

  const built = buildUpdateUniversityTargetInput(input);
  if ("error" in built) return { ok: false, error: built.error };

  const secret = await createSupabaseSecretClient();
  const result = await updateUniversityTargetCore(
    secret,
    targetId,
    built,
    access.actorName,
    access.userId,
  );

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}

export async function updateAdminUniversityTargetStatus(
  targetIdRaw: string,
  status: string,
): Promise<UniversityTargetActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const targetId = parseUniversityTargetId(targetIdRaw);
  if (!targetId) return { ok: false, error: "Invalid university target." };

  const secret = await createSupabaseSecretClient();
  const result = await updateUniversityTargetStatusCore(
    secret,
    targetId,
    status,
    access.actorName,
    access.userId,
  );

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}

export async function updateAdminUniversityTargetDecision(
  targetIdRaw: string,
  decision: string,
): Promise<UniversityTargetActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const targetId = parseUniversityTargetId(targetIdRaw);
  if (!targetId) return { ok: false, error: "Invalid university target." };

  const secret = await createSupabaseSecretClient();
  const result = await updateUniversityTargetDecisionCore(
    secret,
    targetId,
    decision,
    access.actorName,
    access.userId,
  );

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}

export async function deleteAdminUniversityTarget(
  targetIdRaw: string,
): Promise<UniversityTargetActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const targetId = parseUniversityTargetId(targetIdRaw);
  if (!targetId) return { ok: false, error: "Invalid university target." };

  const secret = await createSupabaseSecretClient();
  const result = await deleteUniversityTargetCore(
    secret,
    targetId,
    access.actorName,
    access.userId,
  );

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}

export async function updateAdminUniversityDocRequirementStatus(
  requirementIdRaw: string,
  status: string,
): Promise<UniversityTargetActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const requirementId = parseRequirementId(requirementIdRaw);
  if (!requirementId) return { ok: false, error: "Invalid document requirement." };

  const secret = await createSupabaseSecretClient();
  const result = await updateUniversityDocRequirementStatusCore(
    secret,
    requirementId,
    status,
  );

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}

export async function uploadAdminUniversityDocRequirement(
  requirementIdRaw: string,
  formData: FormData,
): Promise<UniversityTargetActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const requirementId = parseRequirementId(requirementIdRaw);
  if (!requirementId) return { ok: false, error: "Invalid document requirement." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size < 1) {
    return { ok: false, error: "Choose a file to upload." };
  }

  const secret = await createSupabaseSecretClient();
  const result = await uploadUniversityDocRequirementCore(
    secret,
    requirementId,
    file,
  );

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}

export async function linkAdminUniversityDocRequirementToChecklist(
  requirementIdRaw: string,
  checklistDocumentIdRaw: string,
): Promise<UniversityTargetActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const requirementId = parseRequirementId(requirementIdRaw);
  if (!requirementId) return { ok: false, error: "Invalid document requirement." };

  const secret = await createSupabaseSecretClient();
  const result = await linkUniversityDocRequirementToChecklistCore(
    secret,
    requirementId,
    checklistDocumentIdRaw,
  );

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}

export async function clearAdminUniversityDocRequirementFile(
  requirementIdRaw: string,
): Promise<UniversityTargetActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const requirementId = parseRequirementId(requirementIdRaw);
  if (!requirementId) return { ok: false, error: "Invalid document requirement." };

  const secret = await createSupabaseSecretClient();
  const result = await clearUniversityDocRequirementFileCore(secret, requirementId);

  if (result.ok && result.applicationId) {
    revalidateApplicationPaths(result.applicationId);
  }

  return result;
}
