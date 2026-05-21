import type { Database } from "@/database.types";

function trim(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/** Mirrors `student_application_profile_completion_pct` in Postgres. */
export type StudentApplicationProfileCompletionInput = {
  grade: string;
  curriculum: string;
  destinations: string[];
  programs: string[];
  ieltsScore?: string;
  toeflScore?: string;
  englishTestScores?: string;
  satScore?: string;
  actScore?: string;
  satActScores?: string;
};

export type StudentApplicationProfileCompletionRow = Pick<
  Database["public"]["Tables"]["student_application_profile"]["Row"],
  | "grade"
  | "curriculum"
  | "preferred_destinations"
  | "interested_programs"
  | "english_test_scores"
  | "ielts_score"
  | "toefl_score"
  | "sat_score"
  | "act_score"
  | "sat_act_scores"
>;

/** Same weighting as the My Applications profile tab and school RPCs. */
export function getStudentApplicationProfileCompletion(
  args: StudentApplicationProfileCompletionInput,
): { pct: number; missing: number } {
  let ok = 0;
  const total = 6;
  if (trim(args.grade)) ok++;
  if (trim(args.curriculum)) ok++;
  if (args.destinations.length) ok++;
  if (args.programs.length) ok++;

  const hasEnglish =
    !!trim(args.ieltsScore) ||
    !!trim(args.toeflScore) ||
    !!trim(args.englishTestScores);
  const hasStandardizedTest =
    !!trim(args.satScore) ||
    !!trim(args.actScore) ||
    !!trim(args.satActScores);

  if (hasEnglish || hasStandardizedTest) ok++;
  if (hasEnglish && hasStandardizedTest) ok++;
  else if (hasEnglish || hasStandardizedTest) ok += 0.5;

  const pct = Math.round((ok / total) * 100);
  const missing = total - Math.ceil(ok);
  return { pct: Math.min(100, pct), missing: Math.max(0, missing) };
}

export function studentApplicationProfileRowToCompletionInput(
  row: StudentApplicationProfileCompletionRow | null | undefined,
): StudentApplicationProfileCompletionInput {
  return {
    grade: row?.grade ?? "",
    curriculum: row?.curriculum ?? "",
    destinations: row?.preferred_destinations ?? [],
    programs: row?.interested_programs ?? [],
    ieltsScore: row?.ielts_score ?? "",
    toeflScore: row?.toefl_score ?? "",
    englishTestScores: row?.english_test_scores ?? "",
    satScore: row?.sat_score ?? "",
    actScore: row?.act_score ?? "",
    satActScores: row?.sat_act_scores ?? "",
  };
}

/** Live My Applications editor state with legacy column fallbacks when fields are still empty. */
export function buildLiveApplicationProfileCompletionInput(args: {
  grade: string;
  curriculum: string;
  destinations: string[];
  programs: string[];
  ieltsScore: string;
  toeflScore: string;
  satScore: string;
  actScore: string;
  savedApplicationProfile?: StudentApplicationProfileCompletionRow | null;
}): StudentApplicationProfileCompletionInput {
  const saved = args.savedApplicationProfile;
  const useLegacyEnglish =
    !trim(args.ieltsScore) && !trim(args.toeflScore);
  const useLegacySatAct = !trim(args.satScore) && !trim(args.actScore);

  return {
    grade: args.grade,
    curriculum: args.curriculum,
    destinations: args.destinations,
    programs: args.programs,
    ieltsScore: args.ieltsScore,
    toeflScore: args.toeflScore,
    englishTestScores: useLegacyEnglish
      ? (saved?.english_test_scores ?? "")
      : "",
    satScore: args.satScore,
    actScore: args.actScore,
    satActScores: useLegacySatAct ? (saved?.sat_act_scores ?? "") : "",
  };
}
