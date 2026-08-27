import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/database.types";
import { translateProgramDiscoveryById } from "@/lib/translation/translate-program-discovery";
import { translateUniversityProgramsForProgramId } from "@/lib/translation/translate-university-program";
import type { TranslateProgramDiscoveryResult } from "@/lib/translation/translate-program-discovery";
import type { TranslateUniversityProgramResult } from "@/lib/translation/translate-university-program";

type DbClient = SupabaseClient<Database>;

export type TranslateProgramDiscoveryBundleResult =
  | {
      ok: true;
      programResult: TranslateProgramDiscoveryResult;
      universityProgramResults: TranslateUniversityProgramResult[];
      totalTranslatedCount: number;
      errors: string[];
      programTitle: string;
      universityProgramCount: number;
    }
  | { ok: false; error: string; programTitle?: string };

export type TranslateProgramDiscoveryBundleOptions = {
  requestedBy?: string | null;
  requestId?: string;
  skipSave?: boolean;
};

export async function translateProgramDiscoveryBundleById(
  supabase: DbClient,
  programId: string,
  options: TranslateProgramDiscoveryBundleOptions = {},
): Promise<TranslateProgramDiscoveryBundleResult> {
  const requestId = options.requestId ?? crypto.randomUUID();
  const sharedOptions = {
    requestedBy: options.requestedBy,
    requestId,
    skipSave: options.skipSave,
  };

  const programResult = await translateProgramDiscoveryById(
    supabase,
    programId,
    sharedOptions,
  );

  const programTitle =
    programResult.ok || programResult.programTitle
      ? (programResult.programTitle ?? programId)
      : programId;

  if (!programResult.ok && programResult.error === "Program not found.") {
    return {
      ok: false,
      error: programResult.error,
      programTitle,
    };
  }

  const uniBundle = await translateUniversityProgramsForProgramId(
    supabase,
    programId,
    sharedOptions,
  );

  const programTranslatedCount = programResult.ok ? programResult.translatedCount : 0;
  const programErrors = programResult.ok
    ? programResult.errors
    : [programResult.error];
  const errors = [...programErrors, ...uniBundle.errors];
  const totalTranslatedCount = programTranslatedCount + uniBundle.totalTranslatedCount;

  if (!programResult.ok && totalTranslatedCount === 0) {
    return {
      ok: false,
      error: programResult.error,
      programTitle,
    };
  }

  const resolvedProgramResult: TranslateProgramDiscoveryResult = programResult.ok
    ? programResult
    : {
        ok: true,
        translatedCount: 0,
        errors: programErrors,
        programTitle,
      };

  return {
    ok: true,
    programResult: resolvedProgramResult,
    universityProgramResults: uniBundle.results,
    totalTranslatedCount,
    errors,
    programTitle,
    universityProgramCount: uniBundle.results.length,
  };
}
