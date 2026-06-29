import {
  fetchStudentWebinarById,
  fetchStudentWebinarsPage,
} from "@/app/(protected)/student/webinars/_lib/fetch-student-webinars";

export async function fetchPublicWebinarsPage() {
  return fetchStudentWebinarsPage(null);
}

export async function fetchPublicWebinarById(id: number) {
  return fetchStudentWebinarById(id, null);
}
