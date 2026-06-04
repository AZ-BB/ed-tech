export const STUDENT_TEACHER_UNASSIGNED_FILTER = "unassigned" as const;

/** School portal students list: “all students” in the URL (`teacher=all` or omitted). */
export const STUDENT_TEACHER_ALL_FILTER = "all" as const;

export type StudentTeacherFilterValue =
  | ""
  | typeof STUDENT_TEACHER_UNASSIGNED_FILTER
  | string;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function formatSchoolTeacherLabel(
  firstName: string,
  lastName: string,
  email: string,
): string {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  return email.trim() || "Teacher";
}

export function parseStudentTeacherFilterParam(
  raw: string | string[] | undefined,
): StudentTeacherFilterValue {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!value) return "";
  if (value === STUDENT_TEACHER_UNASSIGNED_FILTER) {
    return STUDENT_TEACHER_UNASSIGNED_FILTER;
  }
  if (UUID_RE.test(value)) return value;
  return "";
}

/**
 * School portal `/school/students`: default is all students (no `teacher` filter).
 * `teacher=all` or omitted → all; `teacher=<uuid>` → that teacher (incl. My Students).
 */
export function resolveSchoolStudentsTeacherFilter(
  raw: string | string[] | undefined,
): StudentTeacherFilterValue {
  const value =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;

  if (value === undefined || value === STUDENT_TEACHER_ALL_FILTER || value === "") {
    return "";
  }
  if (value === STUDENT_TEACHER_UNASSIGNED_FILTER) {
    return STUDENT_TEACHER_UNASSIGNED_FILTER;
  }
  if (UUID_RE.test(value)) return value;
  return "";
}

/** Value for the teacher filter `<select>` (URL param), not the resolved DB filter. */
export function schoolStudentsTeacherSelectValue(
  filter: StudentTeacherFilterValue,
  currentTeacherId: string | null,
): string {
  if (filter === "") return STUDENT_TEACHER_ALL_FILTER;
  if (filter === STUDENT_TEACHER_UNASSIGNED_FILTER) {
    return STUDENT_TEACHER_UNASSIGNED_FILTER;
  }
  if (
    currentTeacherId &&
    filter === currentTeacherId
  ) {
    return currentTeacherId;
  }
  return filter;
}

/** `null` = unassign; string = teacher id; `invalid` = bad input */
export function parseStudentTeacherAssignParam(
  raw: string,
): string | null | "invalid" {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === STUDENT_TEACHER_UNASSIGNED_FILTER) {
    return null;
  }
  if (!UUID_RE.test(trimmed)) return "invalid";
  return trimmed;
}

export function teacherNameFromEmbed(
  embed:
    | {
        first_name: string | null;
        last_name: string | null;
        email?: string | null;
      }
    | null
    | undefined,
): string | null {
  if (!embed) return null;
  const label = formatSchoolTeacherLabel(
    embed.first_name?.trim() ?? "",
    embed.last_name?.trim() ?? "",
    embed.email?.trim() ?? "",
  );
  return label === "Teacher" && !embed.email?.trim() ? null : label;
}
