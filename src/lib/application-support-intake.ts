import type { Database } from "@/database.types";
import { DEFAULT_APPLICATION_PACKAGE_DATA } from "@/lib/application-package-data";
import type { createSupabaseSecretClient } from "@/utils/supabase-server";

export type ApplicationSupportPayload = {
  planUniversitiesCount: 5 | 10 | 15;
  studentName: string;
  email: string;
  phone: string;
  nationality: string;
  countryOfResidence: string;
  schoolName: string;
  currentGradeYear: string;
  destinations: string[];
  fieldOfStudy: string;
  applyTiming: string | null;
  planClarity: "clear" | "some" | "help" | null;
  universities: string[];
  uniNotes: string;
  uniIntent: "shortlist" | "ideas" | "help" | null;
};

export const ACTIVE_APPLICATION_STATUSES = [
  "lead",
  "payment_requested",
  "active_package",
] as const;

type ApplicationRow = Database["public"]["Tables"]["applications"]["Row"];
type ApplicationUpdate = Database["public"]["Tables"]["applications"]["Update"];
type ApplicationInsert = Database["public"]["Tables"]["applications"]["Insert"];

type SecretClient = Awaited<ReturnType<typeof createSupabaseSecretClient>>;

const PLAN_COUNTS = [5, 10, 15] as const;

const DESTINATION_CHIPS = [
  "United States",
  "United Kingdom",
  "Canada",
  "Europe",
  "Australia",
  "GCC",
  "Lebanon",
  "Jordan",
  "Egypt",
  "Not sure yet",
] as const;

function isPlaceholder(value: string | null | undefined): boolean {
  const trimmed = value?.trim();
  return !trimmed || trimmed === "—";
}

function parseUniversitiesJson(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function parseLineValue(notes: string, prefix: string): string | null {
  const line = notes
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith(prefix));
  if (!line) return null;
  const value = line.slice(prefix.length).trim();
  return value || null;
}

function parseDestinationsFromPreferred(preferred: string | null): string[] {
  if (isPlaceholder(preferred)) return [];
  const value = preferred ?? "";
  const parts = value
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const matched = parts.filter((p) =>
    (DESTINATION_CHIPS as readonly string[]).includes(p),
  );
  return matched.length > 0 ? matched : parts;
}

export function buildIntakeNotes(payload: ApplicationSupportPayload): string {
  const lines = [
    "--- Application support intake (guided) ---",
    payload.currentGradeYear?.trim() && `School year: ${payload.currentGradeYear.trim()}`,
    payload.destinations?.length && `Destinations: ${payload.destinations.join(", ")}`,
    payload.fieldOfStudy?.trim() && `Field of study (direction): ${payload.fieldOfStudy.trim()}`,
    payload.applyTiming && `When applying: ${payload.applyTiming}`,
    payload.planClarity && `Plan clarity: ${payload.planClarity}`,
    payload.uniIntent && `University list approach: ${payload.uniIntent}`,
  ].filter(Boolean) as string[];
  return lines.join("\n");
}

export function validateApplicationSupportPayload(
  payload: ApplicationSupportPayload,
): string | null {
  if (!payload.studentName?.trim() || !payload.email?.trim() || !payload.phone?.trim()) {
    return "Name, email, and phone are required.";
  }
  if (!PLAN_COUNTS.includes(payload.planUniversitiesCount)) {
    return "Please choose a valid package.";
  }
  return null;
}

export function mapApplicationSupportPayloadToApplicationFields(
  payload: ApplicationSupportPayload,
  plan: { id: number; universities_count: number },
): {
  student_name: string;
  student_email: string;
  student_phone: string;
  school_name: string | null;
  preferences_universities: string[] | null;
  preferences_universities_notes: string | null;
  final_grade: string;
  inteended_fields: string;
  preferred_uni_or_countries: string;
  additional_notes: string | null;
  plan_id: number;
  package_data: ApplicationUpdate["package_data"];
} {
  const universities = (payload.universities ?? []).map((u) => u.trim()).filter(Boolean);

  const contactHeader = [
    payload.nationality?.trim() ? `Nationality: ${payload.nationality.trim()}` : "",
    payload.countryOfResidence?.trim()
      ? `Country of residence: ${payload.countryOfResidence.trim()}`
      : "",
  ].filter(Boolean);

  const intake = buildIntakeNotes(payload);
  const additionalParts = [
    contactHeader.join("\n"),
    intake,
    payload.uniNotes?.trim() ? `Notes:\n${payload.uniNotes.trim()}` : "",
  ].filter(Boolean);

  const additional_notes = additionalParts.length ? additionalParts.join("\n\n") : null;

  const preferred =
    payload.destinations?.filter((d) => d && d !== "Not sure yet").join(", ") ||
    payload.fieldOfStudy?.trim() ||
    "—";

  return {
    student_name: payload.studentName.trim(),
    student_email: payload.email.trim(),
    student_phone: payload.phone.trim(),
    school_name: payload.schoolName?.trim() || null,
    preferences_universities: universities.length ? universities : null,
    preferences_universities_notes: payload.uniNotes?.trim() || null,
    final_grade: payload.currentGradeYear?.trim() || "—",
    inteended_fields: payload.fieldOfStudy?.trim() || "—",
    preferred_uni_or_countries: preferred,
    additional_notes,
    plan_id: plan.id,
    package_data: {
      ...DEFAULT_APPLICATION_PACKAGE_DATA,
      universitiesTotal: plan.universities_count,
    },
  };
}

export function buildEmptyStubApplicationInsert(input: {
  studentId: string;
  schoolId: string | null;
  advisorId: string;
  planId: number;
  planUniversitiesCount: number;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  schoolName: string | null;
}): ApplicationInsert {
  const now = new Date().toISOString();
  return {
    student_id: input.studentId,
    school_id: input.schoolId,
    student_name: input.studentName.trim() || null,
    student_email: input.studentEmail.trim() || null,
    student_phone: input.studentPhone.trim() || null,
    school_name: input.schoolName?.trim() || null,
    curriculum: "other",
    expected_graduation_year: null,
    preferences_universities: null,
    preferences_universities_notes: null,
    final_grade: "—",
    gpa: null,
    sat: null,
    act: null,
    ielts: null,
    toefl: null,
    inteended_fields: "—",
    open_to_realted_fields: false,
    preferred_uni_or_countries: "—",
    extracurricular_activities: "—",
    awards: null,
    additional_notes: null,
    plan_id: input.planId,
    package_data: {
      ...DEFAULT_APPLICATION_PACKAGE_DATA,
      universitiesTotal: input.planUniversitiesCount,
    },
    status: "lead",
    assigned_to: input.advisorId,
    assigned_at: now,
    scheduled_at: null,
    updated_at: now,
  };
}

export function parseApplicationSupportPayloadFromApplication(
  row: Pick<
    ApplicationRow,
    | "student_name"
    | "student_email"
    | "student_phone"
    | "school_name"
    | "final_grade"
    | "inteended_fields"
    | "preferred_uni_or_countries"
    | "preferences_universities"
    | "preferences_universities_notes"
    | "additional_notes"
  >,
  planUniversitiesCount: 5 | 10 | 15,
): ApplicationSupportPayload {
  const notes = row.additional_notes ?? "";
  const nationality = parseLineValue(notes, "Nationality:") ?? "";
  const countryOfResidence = parseLineValue(notes, "Country of residence:") ?? "";

  const destinationsFromNotes = parseLineValue(notes, "Destinations:");
  const destinations = destinationsFromNotes
    ? destinationsFromNotes.split(",").map((d) => d.trim()).filter(Boolean)
    : parseDestinationsFromPreferred(row.preferred_uni_or_countries);

  const fieldFromNotes = parseLineValue(notes, "Field of study (direction):");
  const fieldOfStudy = fieldFromNotes ?? (isPlaceholder(row.inteended_fields) ? "" : row.inteended_fields.trim());

  const applyTiming = parseLineValue(notes, "When applying:");
  const planClarityRaw = parseLineValue(notes, "Plan clarity:");
  const planClarity =
    planClarityRaw === "clear" || planClarityRaw === "some" || planClarityRaw === "help"
      ? planClarityRaw
      : null;

  const uniIntentRaw = parseLineValue(notes, "University list approach:");
  const uniIntent =
    uniIntentRaw === "shortlist" || uniIntentRaw === "ideas" || uniIntentRaw === "help"
      ? uniIntentRaw
      : null;

  let uniNotes = row.preferences_universities_notes?.trim() ?? "";
  const notesMarker = "Notes:\n";
  const notesIndex = notes.indexOf(notesMarker);
  if (notesIndex >= 0) {
    uniNotes = notes.slice(notesIndex + notesMarker.length).trim();
  }

  return {
    planUniversitiesCount,
    studentName: row.student_name?.trim() || "",
    email: row.student_email?.trim() || "",
    phone: row.student_phone?.trim() || "",
    nationality,
    countryOfResidence,
    schoolName: row.school_name?.trim() || "",
    currentGradeYear: isPlaceholder(row.final_grade) ? "" : row.final_grade.trim(),
    destinations,
    fieldOfStudy,
    applyTiming,
    planClarity,
    universities: parseUniversitiesJson(row.preferences_universities),
    uniNotes,
    uniIntent,
  };
}

export async function fetchActivePlanByUniversitiesCount(
  secret: SecretClient,
  universitiesCount: 5 | 10 | 15,
): Promise<{ id: number; universities_count: number } | null> {
  const { data, error } = await secret
    .from("applications_plans")
    .select("id, universities_count")
    .eq("universities_count", universitiesCount)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[fetchActivePlanByUniversitiesCount]", error);
    return null;
  }
  return data;
}

export async function fetchSmallestActivePlan(
  secret: SecretClient,
): Promise<{ id: number; universities_count: number } | null> {
  const { data, error } = await secret
    .from("applications_plans")
    .select("id, universities_count")
    .eq("is_active", true)
    .order("universities_count", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[fetchSmallestActivePlan]", error);
    return null;
  }
  return data;
}

export function resolvePlanUniversitiesCount(
  count: number | null | undefined,
): 5 | 10 | 15 {
  if (count === 10) return 10;
  if (count === 15) return 15;
  return 5;
}
