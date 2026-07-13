import { computeCombinedProfile } from "@/lib/discovery/computeCombinedProfile";
import {
  fetchStudentAttempts,
  loadDiscoveryConfig,
  upsertStudentAttempt,
  upsertStudentDiscoveryProfile,
} from "@/lib/discovery/discovery-repository";
import { getStudentDiscoveryModuleCount } from "@/lib/discovery/discovery-student-modules";
import { getModuleFromConfig, scoreModule } from "@/lib/discovery/scoreModule";
import { validateAnswers } from "@/lib/discovery/validateAnswers";
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

  return result;
}

export async function buildStudentDiscoveryProfileResponse(
  service: ServiceClient,
  studentId: string,
): Promise<StudentDiscoveryProfileResponse> {
  const config = await loadDiscoveryConfig(service);
  const attempts = await fetchStudentAttempts(service, studentId);
  const moduleResults = attempts
    .map((a) => a.result_json as unknown as ModuleResult)
    .filter((r): r is ModuleResult => Boolean(r?.moduleId));

  const combined = computeCombinedProfile(config, moduleResults);
  const totalModules = getStudentDiscoveryModuleCount(config);

  return {
    completedModules: moduleResults.map((r) => r.moduleId),
    earlySignals: combined?.earlySignals ?? [],
    combinedProfile: combined?.profile ?? null,
    moduleResults,
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
