import "server-only";

import { labelPreferredDestinationEntry } from "@/app/(protected)/student/my-applications/_lib/preferred-destinations-iso";
import { getCountryNameByAlpha2, isValidAlpha2Code } from "@/lib/countries";
import { createSupabaseServerClient } from "@/utils/supabase-server";

const SAT_TOTAL_MAX = 1600;

export type AiMatchingProfileDefaults = {
  fullName: string;
  schoolName: string;
  schoolCountry: string;
  nationality: string;
  academicSystem: string;
  predictedScore: string;
  testsTaken: string[];
  testScores: Record<string, string>;
  primaryStudyDestination: string;
  intendedMajor: string;
  budgetBand: string;
};

export const EMPTY_AI_MATCHING_DEFAULTS: AiMatchingProfileDefaults = {
  fullName: "",
  schoolName: "",
  schoolCountry: "",
  nationality: "",
  academicSystem: "",
  predictedScore: "",
  testsTaken: [],
  testScores: {},
  primaryStudyDestination: "",
  intendedMajor: "",
  budgetBand: "",
};

const AI_BUDGET_OPTIONS = new Set(["Need full support", "Moderate", "Flexible"]);

function clampSatTotalDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw.trim();
  const n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n)) return "";
  return String(Math.min(SAT_TOTAL_MAX, n));
}

/** Map `student_application_profile.curriculum` labels toward AI matching `academicSystem` values. */
function mapCurriculumToAcademicSystem(curriculum: string | null | undefined): string {
  const c = (curriculum ?? "").toLowerCase();
  if (!c) return "";
  if (c.includes("ib")) return "ib";
  if (c.includes("a-level") || c.includes("a level") || (c.includes("british") && c.includes("level")))
    return "al";
  if (c.includes("igcse") || c.includes("gcse")) return "igcse";
  if (c.includes("french") || c.includes("baccalaur")) return "french";
  if (c.includes("cbse") || c.includes("icse") || c.includes("isc") || c.includes("indian"))
    return "indian";
  if (
    c.includes("american") ||
    c.includes("high school diploma") ||
    c.includes("gpa") ||
    c.includes("ap course")
  )
    return "us";
  if (c.includes("national curriculum") || c === "national") return "national";
  return "other";
}

function mergeEnglishTests(
  english: string | null | undefined,
): { tests: string[]; scores: Record<string, string> } {
  const tests: string[] = [];
  const scores: Record<string, string> = {};
  const t = (english ?? "").trim();
  if (!t) return { tests, scores };
  const low = t.toLowerCase();
  const firstNum = t.match(/\d+(?:\.\d+)?/)?.[0]?.trim() ?? "";

  if (low.includes("ielts")) {
    tests.push("IELTS");
    scores.IELTS = firstNum || t;
  }
  if (low.includes("toefl")) {
    tests.push("TOEFL");
    const digits = t.replace(/\D/g, "");
    scores.TOEFL = digits.slice(0, 3) || firstNum || t;
  }
  if (low.includes("duolingo")) {
    tests.push("Duolingo");
    const digits = t.replace(/\D/g, "");
    scores.Duolingo = digits.slice(0, 3) || firstNum || t;
  }
  return { tests, scores };
}

export async function loadAiMatchingProfileDefaults(): Promise<AiMatchingProfileDefaults> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return EMPTY_AI_MATCHING_DEFAULTS;

  const { data: row, error } = await supabase
    .from("student_profiles")
    .select(
      `
      first_name,
      last_name,
      nationality_country_code,
      schools ( name, country_code ),
      countries!student_profiles_nationality_country_code_fkey ( name )
    `,
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error || !row) {
    if (error) console.error("[loadAiMatchingProfileDefaults] profile", error.message);
    return EMPTY_AI_MATCHING_DEFAULTS;
  }

  const schoolsEmbed = row.schools as
    | { name?: string | null; country_code?: string | null }
    | { name?: string | null; country_code?: string | null }[]
    | null;
  const school = Array.isArray(schoolsEmbed) ? (schoolsEmbed[0] ?? null) : schoolsEmbed;
  const natEmbed = row.countries as { name?: string | null } | null;

  const fullName = [row.first_name, row.last_name]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean)
    .join(" ");

  const schoolName = school?.name?.trim() ?? "";

  const natName = natEmbed?.name?.trim() ?? "";
  const natCode = String(row.nationality_country_code ?? "").trim();
  const nationality =
    natName ||
    (natCode && isValidAlpha2Code(natCode)
      ? getCountryNameByAlpha2(natCode.toUpperCase()) ?? ""
      : "");

  let schoolCountry = "";
  const schCc = String(school?.country_code ?? "").trim();
  if (schCc && isValidAlpha2Code(schCc)) {
    schoolCountry = getCountryNameByAlpha2(schCc.toUpperCase()) ?? "";
  }

  const { data: app } = await supabase
    .from("student_application_profile")
    .select(
      "curriculum, predicted_grades, sat_score, act_score, english_test_scores, ielts_score, toefl_score, preferred_destinations, interested_programs, budget_range",
    )
    .eq("student_id", user.id)
    .maybeSingle();

  const academicSystem = mapCurriculumToAcademicSystem(app?.curriculum ?? null);
  const predictedScore = (app?.predicted_grades ?? "").trim();

  const testsTaken: string[] = [];
  const testScores: Record<string, string> = {};

  const sat = (app?.sat_score ?? "").trim();
  if (sat) {
    testsTaken.push("SAT");
    testScores.SAT = clampSatTotalDigits(sat);
  }

  const act = (app?.act_score ?? "").trim();
  if (act) {
    testsTaken.push("ACT");
    const digits = act.replace(/\D/g, "");
    let n = digits ? Number.parseInt(digits, 10) : NaN;
    if (Number.isFinite(n) && n > 36 && digits.length >= 2) {
      n = Number.parseInt(digits.slice(0, 2), 10);
    }
    testScores.ACT = Number.isFinite(n)
      ? String(Math.min(36, Math.max(1, n)))
      : act;
  }

  const ielts = (app?.ielts_score ?? "").trim();
  const toefl = (app?.toefl_score ?? "").trim();
  if (ielts) {
    if (!testsTaken.includes("IELTS")) testsTaken.push("IELTS");
    if (!testScores.IELTS) testScores.IELTS = ielts;
  }
  if (toefl) {
    if (!testsTaken.includes("TOEFL")) testsTaken.push("TOEFL");
    if (!testScores.TOEFL) testScores.TOEFL = toefl;
  }
  if (!ielts && !toefl) {
    const eng = mergeEnglishTests(app?.english_test_scores);
    for (const t of eng.tests) {
      if (!testsTaken.includes(t)) testsTaken.push(t);
    }
    for (const [k, v] of Object.entries(eng.scores)) {
      if (!testScores[k]) testScores[k] = v;
    }
  }

  const prefOrder = ["SAT", "ACT", "IELTS", "TOEFL", "Duolingo"];
  const deduped = [...new Set(testsTaken)];
  deduped.sort(
    (a, b) => prefOrder.indexOf(a) - prefOrder.indexOf(b) || a.localeCompare(b),
  );
  const testsSorted = deduped.filter((t) => prefOrder.includes(t));

  const prefs = app?.preferred_destinations;
  let primaryStudyDestination = "";
  if (Array.isArray(prefs) && prefs.length > 0) {
    const first = prefs.find((p) => typeof p === "string" && p.trim());
    if (first) primaryStudyDestination = labelPreferredDestinationEntry(first);
  }

  const programs = app?.interested_programs;
  const intendedMajor =
    Array.isArray(programs) && typeof programs[0] === "string" && programs[0].trim()
      ? programs[0].trim()
      : "";

  const br = (app?.budget_range ?? "").trim();
  const budgetBand = AI_BUDGET_OPTIONS.has(br) ? br : "";

  return {
    fullName,
    schoolName,
    schoolCountry,
    nationality,
    academicSystem,
    predictedScore,
    testsTaken: testsSorted,
    testScores,
    primaryStudyDestination,
    intendedMajor,
    budgetBand,
  };
}
