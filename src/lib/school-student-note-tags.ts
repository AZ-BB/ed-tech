/** Matches Teacher Portal mock (`renderNotes` tag picker). */
export const SCHOOL_STUDENT_NOTE_TAGS = [
  "General",
  "Parent concern",
  "Application strategy",
  "Essay feedback",
  "Scholarship",
  "Risk flag",
  "Follow-up",
] as const;

export type SchoolStudentNoteTag = (typeof SCHOOL_STUDENT_NOTE_TAGS)[number];

export function isSchoolStudentNoteTag(value: string): value is SchoolStudentNoteTag {
  return (SCHOOL_STUDENT_NOTE_TAGS as readonly string[]).includes(value);
}
