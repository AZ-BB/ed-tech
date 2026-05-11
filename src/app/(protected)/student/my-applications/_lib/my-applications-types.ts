import type { Database } from "@/database.types";

type StudentProfileRow = Database["public"]["Tables"]["student_profiles"]["Row"];
type ApplicationProfileRow = Database["public"]["Tables"]["student_application_profile"]["Row"];
type ShortlistRow = Database["public"]["Tables"]["student_shortlist_universities"]["Row"];
type DocRow = Database["public"]["Tables"]["student_my_application_documents"]["Row"];
export type EssayRow =
  Database["public"]["Tables"]["student_my_application_essays"]["Row"];
export type EssayCommentRow =
  Database["public"]["Tables"]["student_my_application_essay_comments"]["Row"];

/** Essays from API with nested counselor comments (sorted in UI by created_at) */
export type EssayWithComments = EssayRow & {
  student_my_application_essay_comments?: EssayCommentRow[] | null;
};
type RecRow = Database["public"]["Tables"]["student_my_application_recommendations"]["Row"];
type TaskRow = Database["public"]["Tables"]["student_my_application_tasks"]["Row"];

/** One catalog university per `uni_id`: latest matching `student_activities` row (e.g. type save). */
export type ActivityCatalogUniversity = {
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
  activityFavouriteUniversities: ActivityCatalogUniversity[];
  shortlist: ShortlistRow[];
  documents: DocRow[];
  essays: EssayWithComments[];
  recommendations: RecRow[];
  tasks: TaskRow[];
};
