import "server-only";

import {
  COUNTRY_OPTIONS,
  NATIONALITY_OPTIONS,
  VF_GRADE_YEAR_OPTIONS,
} from "@/app/(protected)/student/application-support/_data/application-support-options";
import { labelPreferredDestinationEntry } from "@/app/(protected)/student/my-applications/_lib/preferred-destinations-iso";
import { COUNTRIES, getCountryNameByAlpha2, isValidAlpha2Code } from "@/lib/countries";
import { getDemonymByAlpha2 } from "@/lib/country-demonyms";
import { createSupabaseServerClient } from "@/utils/supabase-server";

export type StudentFormDefaults = {
  fullName: string;
  email: string;
  phone: string;
  schoolName: string;
  nationality: string;
  countryOfResidence: string;
  gradeYear: string;
  destinationCountryCode: string;
};

export const EMPTY_STUDENT_FORM_DEFAULTS: StudentFormDefaults = {
  fullName: "",
  email: "",
  phone: "",
  schoolName: "",
  nationality: "",
  countryOfResidence: "",
  gradeYear: "",
  destinationCountryCode: "",
};

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

function resolveSelectOption(options: readonly string[], candidate: string): string {
  const c = candidate.trim();
  if (!c) return "";
  if (options.includes(c)) return c;
  const lower = c.toLowerCase();
  const caseMatch = options.find((o) => o.toLowerCase() === lower);
  if (caseMatch) return caseMatch;
  const normalized = stripAccents(lower);
  const accentMatch = options.find(
    (o) => stripAccents(o).toLowerCase() === normalized,
  );
  return accentMatch ?? "";
}

function mapGradeYear(grade: string | null | undefined): string {
  const g = (grade ?? "").trim();
  if (!g) return "";
  const exact = resolveSelectOption(VF_GRADE_YEAR_OPTIONS, g);
  if (exact) return exact;
  const low = g.toLowerCase();
  if (low.includes("gap")) return "Gap year";
  if (low.includes("graduat")) return "Already graduated";
  if (/\b12\b|twelfth|year\s*12/.test(low)) return "Grade 12";
  if (/\b11\b|eleventh|year\s*11/.test(low)) return "Grade 11";
  if (/\b10\b|tenth|year\s*10/.test(low)) return "Grade 10";
  return "";
}

function resolveDestinationAlpha2(raw: string | null | undefined): string {
  const t = (raw ?? "").trim();
  if (!t) return "";
  const upper = t.toUpperCase();
  if (upper.length === 2 && isValidAlpha2Code(upper)) return upper;
  const isoNameToAlpha = new Map<string, string>();
  for (const c of COUNTRIES) {
    isoNameToAlpha.set(c.name.trim().toLowerCase(), c.alpha2);
  }
  const byIsoName = isoNameToAlpha.get(t.toLowerCase());
  if (byIsoName) return byIsoName;
  const labeled = labelPreferredDestinationEntry(t);
  const byLabel = isoNameToAlpha.get(labeled.trim().toLowerCase());
  return byLabel ?? "";
}

export async function loadStudentFormDefaults(
  studentId: string,
  authEmail?: string | null,
): Promise<StudentFormDefaults> {
  const supabase = await createSupabaseServerClient();

  const { data: row, error } = await supabase
    .from("student_profiles")
    .select(
      `
      first_name,
      last_name,
      email,
      phone,
      grade,
      nationality_country_code,
      schools ( name, country_code )
    `,
    )
    .eq("id", studentId)
    .maybeSingle();

  if (error || !row) {
    if (error) console.error("[loadStudentFormDefaults] profile", error.message);
    return {
      ...EMPTY_STUDENT_FORM_DEFAULTS,
      email: authEmail?.trim() ?? "",
    };
  }

  const schoolsEmbed = row.schools as
    | { name?: string | null; country_code?: string | null }
    | { name?: string | null; country_code?: string | null }[]
    | null;
  const school = Array.isArray(schoolsEmbed) ? (schoolsEmbed[0] ?? null) : schoolsEmbed;

  const fullName = [row.first_name, row.last_name]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean)
    .join(" ");

  const email = row.email?.trim() || authEmail?.trim() || "";
  const phone = row.phone?.trim() ?? "";
  const schoolName = school?.name?.trim() ?? "";

  const natCode = String(row.nationality_country_code ?? "").trim().toUpperCase();
  const nationality = natCode
    ? resolveSelectOption(NATIONALITY_OPTIONS, getDemonymByAlpha2(natCode))
    : "";

  const schoolCountryCode = String(school?.country_code ?? "").trim().toUpperCase();
  const countryOfResidence = schoolCountryCode
    ? resolveSelectOption(
        COUNTRY_OPTIONS,
        getCountryNameByAlpha2(schoolCountryCode) ?? "",
      )
    : "";

  const gradeYear = mapGradeYear(row.grade);

  const { data: appProfile } = await supabase
    .from("student_application_profile")
    .select("preferred_destinations, grade")
    .eq("student_id", studentId)
    .maybeSingle();

  const appGradeYear = mapGradeYear(appProfile?.grade);
  const resolvedGradeYear = gradeYear || appGradeYear;

  const prefs = appProfile?.preferred_destinations;
  let destinationCountryCode = "";
  if (Array.isArray(prefs)) {
    for (const entry of prefs) {
      if (typeof entry !== "string") continue;
      destinationCountryCode = resolveDestinationAlpha2(entry);
      if (destinationCountryCode) break;
    }
  }

  return {
    fullName,
    email,
    phone,
    schoolName,
    nationality,
    countryOfResidence,
    gradeYear: resolvedGradeYear,
    destinationCountryCode,
  };
}
