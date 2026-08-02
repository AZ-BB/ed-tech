import type { DocRow } from "@/lib/ensure-student-application-documents";
import type { ApplicationTaskRow } from "@/lib/fetch-application-tasks";
import type { ApplicationUniversityTargetRow } from "@/lib/application-university-target-mapper";

export type StudentApplicationSupportIntake = {
  id: number;
  status: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  schoolName: string | null;
  curriculum: string | null;
  expectedGraduationYear: number | null;
  finalGrade: string;
  gpa: number | null;
  sat: number | null;
  act: number | null;
  ielts: number | null;
  toefl: number | null;
  intendedFields: string;
  openToRelatedFields: boolean;
  preferredUniOrCountries: string;
  extracurricularActivities: string;
  awards: string | null;
  additionalNotes: string | null;
  preferencesUniversitiesNotes: string | null;
  universities: string[];
};

export type StudentApplicationSupportAdvisor = {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  languages: string | null;
  experienceYears: number | null;
  about: string | null;
  avatarUrl: string | null;
  sessionFor: string | null;
  specializationsLabel: string | null;
  calendlySchedulingUrl: string | null;
};

export type StudentApplicationSupportDashboardPayload = {
  studentId: string;
  application: StudentApplicationSupportIntake;
  totalPaidAed: number;
  universitiesTotal: number;
  universityTargets: ApplicationUniversityTargetRow[];
  documents: DocRow[];
  tasks: ApplicationTaskRow[];
  advisor: StudentApplicationSupportAdvisor | null;
};
