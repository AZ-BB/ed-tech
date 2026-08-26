import { computeCombinedProfile } from "@/lib/discovery/computeCombinedProfile";
import {
  fetchDiscoveryModuleContentArMap,
  fetchDiscoverySettings,
  fetchStudentAttempts,
  loadDiscoveryConfig,
  upsertStudentAttempt,
  upsertStudentDiscoveryProfile,
} from "@/lib/discovery/discovery-repository";
import { getStudentDiscoveryModuleCount } from "@/lib/discovery/discovery-student-modules";
import { getModuleFromConfig, scoreModule } from "@/lib/discovery/scoreModule";
import { validateAnswers } from "@/lib/discovery/validateAnswers";
import {
  applyDiscoveryCombinedProfileLocalization,
  applyDiscoveryModuleLocalization,
  localizeModuleResult,
} from "@/lib/content-localization";
import type { Locale } from "@/lib/i18n/config";
import {
  recordStudentPlatformCompletionOnce,
  STUDENT_PLATFORM_COMPLETION_FLAGS,
} from "@/lib/student-platform-completion";
import type { Json } from "@/database.types";
import type { ModuleAnswer, ModuleResult, StudentDiscoveryProfileResponse } from "@/types/discovery";
import type { createSupabaseSecretClient, createSupabaseServerClient } from "@/utils/supabase-server";

type ServiceClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;
type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export async function submitDiscoveryModule(
  service: ServiceClient,
  studentId: string,
  moduleId: string,
  answers: ModuleAnswer[],
  locale: Locale = "en",
): Promise<ModuleResult> {
  const config = await loadDiscoveryConfig(service);
  const module = getModuleFromConfig(config, moduleId);
  if (!module) {
    throw new Error("Module not found.");
  }

  const validation = validateAnswers(module, answers);
  if (!validation.ok) {
    const message = validation.errors.map((e) => `${e.path}: ${e.message}`).join("; ");
    throw new Error(message);
  }

  const completedAt = new Date().toISOString();
  const result = scoreModule(config, moduleId, validation.record, completedAt);

  await upsertStudentAttempt(service, {
    studentId,
    moduleId,
    answersJson: answers as unknown as Json,
    resultJson: result as unknown as Json,
    configVersion: config.version,
    completedAt,
  });

  const attempts = await fetchStudentAttempts(service, studentId);
  const moduleResults = attempts
    .map((a) => a.result_json as unknown as ModuleResult)
    .filter((r): r is ModuleResult => Boolean(r?.moduleId));

  const combined = computeCombinedProfile(config, moduleResults);
  const completedModules = moduleResults.map((r) => r.moduleId);

  await upsertStudentDiscoveryProfile(service, {
    studentId,
    completedModules,
    combinedProfileJson: (combined ?? {}) as unknown as Json,
    configVersion: config.version,
  });

  const totalModules = getStudentDiscoveryModuleCount(config);
  if (totalModules > 0 && completedModules.length >= totalModules) {
    // Platform completion uses server client with student session — caller handles this
  }

  const contentArMap = await fetchDiscoveryModuleContentArMap(service);
  const moduleConfig = getModuleFromConfig(config, moduleId);
  const moduleContentAr = contentArMap[moduleId] ?? null;
  return localizeModuleResult(
    locale,
    result,
    moduleContentAr as never,
    moduleConfig?.categories,
  );
}

export async function buildStudentDiscoveryProfileResponse(
  service: ServiceClient,
  studentId: string,
  locale: Locale = "en",
): Promise<StudentDiscoveryProfileResponse> {
  const config = await loadDiscoveryConfig(service);
  const attempts = await fetchStudentAttempts(service, studentId);
  const moduleResults = attempts
    .map((a) => a.result_json as unknown as ModuleResult)
    .filter((r): r is ModuleResult => Boolean(r?.moduleId));

  const combined = computeCombinedProfile(config, moduleResults);
  const totalModules = getStudentDiscoveryModuleCount(config);

  const [contentArMap, settings] = await Promise.all([
    fetchDiscoveryModuleContentArMap(service),
    fetchDiscoverySettings(service),
  ]);

  const localizedModuleResults = moduleResults.map((result) => {
    const moduleConfig = config.modules.find((m) => m.moduleId === result.moduleId);
    return localizeModuleResult(
      locale,
      result,
      (contentArMap[result.moduleId] ?? null) as never,
      moduleConfig?.categories,
    );
  });

  const localizedCombinedProfile = combined?.profile
    ? applyDiscoveryCombinedProfileLocalization(
        locale,
        combined.profile,
        settings.content_ar ?? null,
      )
    : null;

  const localizedEarlySignals = (combined?.earlySignals ?? []).map((signal) => {
    const moduleConfig = config.modules.find((m) => m.moduleId === signal.moduleId);
    if (!moduleConfig) return signal;
    const localized = applyDiscoveryModuleLocalization(
      locale,
      moduleConfig,
      (contentArMap[signal.moduleId] ?? null) as never,
    );
    return {
      ...signal,
      moduleTitle: localized.title,
    };
  });

  return {
    completedModules: moduleResults.map((r) => r.moduleId),
    earlySignals: localizedEarlySignals,
    combinedProfile: localizedCombinedProfile,
    moduleResults: localizedModuleResults,
    completedCount: moduleResults.length,
    totalModules,
  };
}

export async function recordDiscoveryJourneyCompletionIfDone(
  supabase: ServerClient,
  studentId: string,
  service: ServiceClient,
): Promise<void> {
  const config = await loadDiscoveryConfig(service);
  const attempts = await fetchStudentAttempts(service, studentId);
  const completedCount = attempts.length;
  const totalModules = getStudentDiscoveryModuleCount(config);
  if (totalModules > 0 && completedCount >= totalModules) {
    await recordStudentPlatformCompletionOnce(
      supabase,
      studentId,
      STUDENT_PLATFORM_COMPLETION_FLAGS.completed_discovery_journey,
    );
  }
}
