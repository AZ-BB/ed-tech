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

export type StudentApplicationSupportPlan = {
  name: string;
  description: string | null;
  price: number;
  universitiesCount: number;
};

export type StudentApplicationSupportDashboardPayload = {
  studentId: string;
  application: StudentApplicationSupportIntake;
  plan: StudentApplicationSupportPlan | null;
  universitiesTotal: number;
  universityTargets: ApplicationUniversityTargetRow[];
  documents: DocRow[];
  tasks: ApplicationTaskRow[];
};
