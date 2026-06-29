import { fetchStudentWebinarsPage } from "@/app/(protected)/student/webinars/_lib/fetch-student-webinars";

export async function fetchPublicWebinarsPage() {
  return fetchStudentWebinarsPage(null);
}
