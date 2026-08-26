import {
  fetchStudentWebinarById,
  fetchStudentWebinarsPage,
} from "@/app/(protected)/student/webinars/_lib/fetch-student-webinars";
import type { Locale } from "@/lib/i18n/config";

export async function fetchPublicWebinarsPage(locale?: Locale) {
  return fetchStudentWebinarsPage(null, locale);
}

export async function fetchPublicWebinarById(id: number, locale?: Locale) {
  return fetchStudentWebinarById(id, null, locale);
}
