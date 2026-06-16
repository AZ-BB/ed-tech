"use server";

import { assertAdvisorAccess, assertAdvisorAssignedApplication } from "@/lib/advisor-access";
import {
  parseApplicationId,
  toggleApplicationPackageLifecycleCore,
  updateApplicationPackageDataCore,
  updateApplicationPackageUniversitiesTotalCore,
  type PackageActionResult,
} from "@/lib/application-package-actions-core";
import type { ApplicationPackageLifecycleKey } from "@/lib/application-package-data";
import { createSupabaseSecretClient } from "@/utils/supabase-server";
import { revalidatePath } from "next/cache";

function revalidateApplicationPaths(applicationId: number) {
  revalidatePath("/advisor/applications");
  revalidatePath(`/advisor/applications/${applicationId}`);
}

export async function toggleAdvisorApplicationPackageLifecycle(
  applicationIdRaw: string,
  key: ApplicationPackageLifecycleKey,
  completed: boolean,
): Promise<PackageActionResult> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;

  const applicationId = parseApplicationId(applicationIdRaw);
  if (!applicationId) return { ok: false, error: "Invalid application." };

  const assigned = await assertAdvisorAssignedApplication(access.advisorId, applicationId);
  if (!assigned.ok) return assigned;

  const secret = await createSupabaseSecretClient();
  const result = await toggleApplicationPackageLifecycleCore(
    secret,
    applicationId,
    key,
    completed,
  );

  if (result.ok) {
    revalidateApplicationPaths(applicationId);
  }

  return result;
}

export async function updateAdvisorApplicationPackageStats(
  applicationIdRaw: string,
  universitiesAdded: number,
  applicationsSubmitted: number,
  startedAt: string | null,
): Promise<PackageActionResult> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;

  const applicationId = parseApplicationId(applicationIdRaw);
  if (!applicationId) return { ok: false, error: "Invalid application." };

  const assigned = await assertAdvisorAssignedApplication(access.advisorId, applicationId);
  if (!assigned.ok) return assigned;

  if (!Number.isFinite(universitiesAdded) || universitiesAdded < 0) {
    return { ok: false, error: "Universities added must be zero or greater." };
  }

  if (!Number.isFinite(applicationsSubmitted) || applicationsSubmitted < 0) {
    return { ok: false, error: "Applications submitted must be zero or greater." };
  }

  const secret = await createSupabaseSecretClient();
  const result = await updateApplicationPackageDataCore(secret, applicationId, {
    universitiesAdded: Math.floor(universitiesAdded),
    applicationsSubmitted: Math.floor(applicationsSubmitted),
    startedAt,
  });

  if (result.ok) {
    revalidateApplicationPaths(applicationId);
  }

  return result;
}

export async function updateAdvisorApplicationPackageUniversitiesTotal(
  applicationIdRaw: string,
  universitiesTotal: number,
): Promise<PackageActionResult> {
  const access = await assertAdvisorAccess();
  if (!access.ok) return access;

  const applicationId = parseApplicationId(applicationIdRaw);
  if (!applicationId) return { ok: false, error: "Invalid application." };

  const assigned = await assertAdvisorAssignedApplication(access.advisorId, applicationId);
  if (!assigned.ok) return assigned;

  const secret = await createSupabaseSecretClient();
  const result = await updateApplicationPackageUniversitiesTotalCore(
    secret,
    applicationId,
    universitiesTotal,
  );

  if (result.ok) {
    revalidateApplicationPaths(applicationId);
  }

  return result;
}
