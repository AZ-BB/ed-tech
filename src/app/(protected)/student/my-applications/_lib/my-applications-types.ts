import type { Database } from "@/database.types";

type StudentProfileRow = Database["public"]["Tables"]["student_profiles"]["Row"];
type ApplicationProfileRow = Database["public"]["Tables"]["student_application_profile"]["Row"];
type ShortlistRow = Database["public"]["Tables"]["student_shortlist_universities"]["Row"];
type DocRow = Database["public"]["Tables"]["student_my_application_documents"]["Row"];
type EssayRow = Database["public"]["Tables"]["student_my_application_essays"]["Row"];
type RecRow = Database["public"]["Tables"]["student_my_application_recommendations"]["Row"];
type TaskRow = Database["public"]["Tables"]["student_my_application_tasks"]["Row"];

/** One row per university: latest `student_activities` shortlist for that catalog uni. */
export type ActivityShortlistedUniversity = {
  activityId: number;
  uniId: string;
  createdAt: string | null;
  name: string;
  city: string;
  countryName: string | null;
  countryCode: string;
  method: string | null;
  deadlineDate: string | null;
};

export type MyApplicationsInitialPayload = {
  studentId: string;
  profile: StudentProfileRow;
  countries: { id: string; name: string }[];
  applicationProfile: ApplicationProfileRow | null;
  activityShortlistedUniversities: ActivityShortlistedUniversity[];
  shortlist: ShortlistRow[];
  documents: DocRow[];
  essays: EssayRow[];
  recommendations: RecRow[];
  tasks: TaskRow[];
};
