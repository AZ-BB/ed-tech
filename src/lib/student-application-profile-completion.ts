import type { Database } from "@/database.types";

export type StudentApplicationProfileCompletionInput = {
  grade: string;
  curriculum: string;
  destinations: string[];
  programs: string[];
  english: string;
  sat: string;
  act: string;
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

/** Same weighting as the My Applications profile tab. */
export function getStudentApplicationProfileCompletion(
  args: StudentApplicationProfileCompletionInput,
): { pct: number; missing: number } {
  let ok = 0;
  const total = 6;
  if (args.grade.trim()) ok++;
  if (args.curriculum.trim()) ok++;
  if (args.destinations.length) ok++;
  if (args.programs.length) ok++;
  const hasEnglish = !!args.english.trim();
  const hasStandardizedTest = !!(args.sat.trim() || args.act.trim());
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
    english: row?.ielts_score || row?.toefl_score
      ? [row.ielts_score && `IELTS ${row.ielts_score}`, row.toefl_score && `TOEFL ${row.toefl_score}`].filter(Boolean).join(" · ")
      : row?.english_test_scores ?? "",
    sat: row?.sat_score ?? row?.sat_act_scores ?? "",
    act: row?.act_score ?? "",
  };
}
