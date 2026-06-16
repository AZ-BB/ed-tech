import {
  APPLICATION_PACKAGE_LIFECYCLE_KEYS,
  DEFAULT_APPLICATION_PACKAGE_DATA,
  parseApplicationPackageData,
  type ApplicationPackageData,
  type ApplicationPackageLifecycleKey,
} from "@/lib/application-package-data";
import { createSupabaseSecretClient } from "@/utils/supabase-server";

export type PackageActionResult =
  | { ok: true; applicationId: number }
  | { ok: false; error: string };

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

export function parseApplicationId(raw: string): number | null {
  const id = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(id) || id < 1) return null;
  return id;
}

function isLifecycleKey(value: string): value is ApplicationPackageLifecycleKey {
  return (APPLICATION_PACKAGE_LIFECYCLE_KEYS as readonly string[]).includes(value);
}

function mergePackageData(
  current: ApplicationPackageData,
  patch: Partial<ApplicationPackageData>,
): ApplicationPackageData {
  return {
    universitiesAdded:
      patch.universitiesAdded ?? current.universitiesAdded,
    applicationsSubmitted:
      patch.applicationsSubmitted ?? current.applicationsSubmitted,
    startedAt: patch.startedAt !== undefined ? patch.startedAt : current.startedAt,
    universitiesTotal:
      patch.universitiesTotal !== undefined
        ? patch.universitiesTotal
        : current.universitiesTotal,
    lifecycle: patch.lifecycle
      ? { ...current.lifecycle, ...patch.lifecycle }
      : current.lifecycle,
  };
}

async function loadApplicationPackageData(
  supabase: SecretClient,
  applicationId: number,
): Promise<ApplicationPackageData | null> {
  const { data, error } = await supabase
    .from("applications")
    .select("package_data")
    .eq("id", applicationId)
    .maybeSingle();

  if (error) {
    console.error("[application-package] load", error);
    return null;
  }

  if (!data) return null;
  return parseApplicationPackageData(data.package_data);
}

export async function updateApplicationPackageDataCore(
  supabase: SecretClient,
  applicationId: number,
  patch: Partial<ApplicationPackageData>,
): Promise<PackageActionResult> {
  const current =
    (await loadApplicationPackageData(supabase, applicationId)) ??
    DEFAULT_APPLICATION_PACKAGE_DATA;

  const next = mergePackageData(current, patch);

  const { error } = await supabase
    .from("applications")
    .update({ package_data: next })
    .eq("id", applicationId);

  if (error) {
    console.error("[application-package] update", error);
    return { ok: false, error: "Could not update package data." };
  }

  return { ok: true, applicationId };
}

export async function toggleApplicationPackageLifecycleCore(
  supabase: SecretClient,
  applicationId: number,
  keyRaw: string,
  completed: boolean,
): Promise<PackageActionResult> {
  if (!isLifecycleKey(keyRaw)) {
    return { ok: false, error: "Invalid lifecycle step." };
  }

  const current =
    (await loadApplicationPackageData(supabase, applicationId)) ??
    DEFAULT_APPLICATION_PACKAGE_DATA;

  return updateApplicationPackageDataCore(supabase, applicationId, {
    lifecycle: { ...current.lifecycle, [keyRaw]: completed },
  });
}

export async function updateApplicationPackageUniversitiesTotalCore(
  supabase: SecretClient,
  applicationId: number,
  universitiesTotal: number,
): Promise<PackageActionResult> {
  if (!Number.isFinite(universitiesTotal) || universitiesTotal < 1) {
    return { ok: false, error: "Universities included must be at least 1." };
  }

  const total = Math.floor(universitiesTotal);

  const { count, error: countError } = await supabase
    .from("application_university_targets")
    .select("id", { count: "exact", head: true })
    .eq("application_id", applicationId);

  if (countError) {
    console.error("[application-package] count targets", countError);
    return { ok: false, error: "Could not verify university applications." };
  }

  const currentTargets = count ?? 0;
  if (total < currentTargets) {
    return {
      ok: false,
      error: `Cannot set below ${currentTargets} — that many universities are already on this application.`,
    };
  }

  const result = await updateApplicationPackageDataCore(supabase, applicationId, {
    universitiesTotal: total,
  });

  if (result.ok) {
    const now = new Date().toISOString();
    await supabase
      .from("applications")
      .update({ updated_at: now })
      .eq("id", applicationId);
  }

  return result;
}
