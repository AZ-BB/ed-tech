"use server";

import {
  parseApplicationId,
  toggleApplicationPackageLifecycleCore,
  updateApplicationPackageDataCore,
  updateApplicationPackageUniversitiesTotalCore,
  type PackageActionResult,
} from "@/lib/application-package-actions-core";
import type { ApplicationPackageLifecycleKey } from "@/lib/application-package-data";
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
    .select("id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !admin) {
    return { ok: false as const, error: "You do not have permission to manage applications." };
  }

  if (admin.is_active === false) {
    return { ok: false as const, error: "Your admin account is inactive." };
  }

  return { ok: true as const };
}

function revalidateApplicationPaths(applicationId: number) {
  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${applicationId}`);
}

export async function toggleAdminApplicationPackageLifecycle(
  applicationIdRaw: string,
  key: ApplicationPackageLifecycleKey,
  completed: boolean,
): Promise<PackageActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const applicationId = parseApplicationId(applicationIdRaw);
  if (!applicationId) return { ok: false, error: "Invalid application." };

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

export async function updateAdminApplicationPackageStats(
  applicationIdRaw: string,
  universitiesAdded: number,
  applicationsSubmitted: number,
  startedAt: string | null,
): Promise<PackageActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const applicationId = parseApplicationId(applicationIdRaw);
  if (!applicationId) return { ok: false, error: "Invalid application." };

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

export async function updateAdminApplicationPackageUniversitiesTotal(
  applicationIdRaw: string,
  universitiesTotal: number,
): Promise<PackageActionResult> {
  const access = await assertAdminAccess();
  if (!access.ok) return access;

  const applicationId = parseApplicationId(applicationIdRaw);
  if (!applicationId) return { ok: false, error: "Invalid application." };

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
